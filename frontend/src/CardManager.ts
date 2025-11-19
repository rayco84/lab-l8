import {
    WalletClient,
    PushDrop,
    Utils,
    LockingScript,
    Transaction,
    WalletProtocol,
    WERR_REVIEW_ACTIONS
} from '@bsv/sdk'
import { v4 as uuidv4 } from 'uuid'

export interface CardData {
    name: string
    description: string
    rarity: string
    ability: string
    history: HistoryEntry[]
    sats: number
    txid: string
    outputIndex: number
    outputScript: string
    keyID: string
    status: 'active' | 'redeemed'
    envelope?: any
}

export interface HistoryEntry{
    timestamp: number
    event: 'Created' | 'Redeemed' | 'Traded' | 'Upgraded'
    metadata?: Record<string, any>
}


const PROTOCOL_ID: WalletProtocol = [1, 'card collectibles']
const BASKET_NAME = 'cards'

const walletClient = new WalletClient('json-api', 'localhost')
const pushdrop = new PushDrop(walletClient)


function generateUniqueKeyID(): string {
    return uuidv4()
}

function createCreationHistoryEntry(): HistoryEntry {        // helper func to set first history entry (created)
    return {
        timestamp: Date.now(),
        event: 'Created'
    }    
}
function createRedemptionHistoryEntry(): HistoryEntry {     // helper func to set last history entry (redeemed)
    return {
        timestamp: Date.now(),
        event: 'Redeemed'
    }
} 


export async function createCard(
    card: Omit<
        CardData,
        'txid' | 'outputIndex' | 'outputScript' | 'envelope' | 'keyID' | 'history' | 'status'
    >,
    testWerrLabel = false
): Promise<void> {
    try {
        const keyID = generateUniqueKeyID()   //gen unique key

        const initialHistory = createCreationHistoryEntry()     // declare history array and first entry
        const historyArray = [initialHistory]

        const cardAttributes = {  // card deets in json
            name: card.name,
            description: card.description,
            rarity: card.rarity,
            ability: card.ability
        }
        const attributesJSON = JSON.stringify(cardAttributes)  // convert to stirng then utf8
        const attributesBytes = Utils.toArray(attributesJSON, 'utf8')

        const lockingScript = await pushdrop.lock(
            [attributesBytes],
            PROTOCOL_ID,
            keyID,
            'self',
            true
        )

        const result = await walletClient.createAction({  // create and broadcast
            outputs: [{
                lockingScript: lockingScript.toHex(),
                satoshis: card.sats,
                outputDescription:'Collectable card token',
                basket: BASKET_NAME,
                customInstructions: JSON.stringify({
                    keyID,
                    history: historyArray,
                    status: 'active'
                })
            }],
            description: `Create card: ${card.name}`,
            options: {
                randomizeOutputs: false,
                acceptDelayedBroadcast: false
            }
        })

        console.log(`[createCard] Card "${card.name}" created successfully!`) // ack status
        
    } catch (err:unknown) {   // cover all errors pattern from L7
          if (err instanceof WERR_REVIEW_ACTIONS) {
            console.error('[createTaskToken] Wallet threw WERR_REVIEW_ACTIONS:', {
                code: err.code,
                message: err.message,
                reviewActionResults: err.reviewActionResults,
                sendWithResults: err.sendWithResults,
                txid: err.txid,
                tx: err.tx,
                noSendChange: err.noSendChange
            })
        } else if (err instanceof Error) {
            console.error('[createTaskToken] Creation failed with error:', {
                message: err.message,
                name: err.name,
                stack: err.stack,
                error: err
            })
        } else {
            console.error('[createTaskToken] Creation failed with unknown error:', err)
        }
        
        throw err
    }
  // TODO: Implement the logic to create a collectible card token with fields: name, description, rarity, ability, history, sats:
  // 1. Generate a unique keyID using generateUniqueKeyID.
  // 2. Create a JSON object with card attributes (name, description, rarity, ability) and convert it to a UTF-8 array using Utils.toArray.
  // 3. Use pushdrop.lock to create a locking script with the encoded attributes, PROTOCOL_ID, keyID, 'self', and true for locking.
  // 4. Call walletClient.createAction to create a transaction with the locking script, card.sats, BASKET_NAME, and custom instructions (JSON.stringify({ keyID, history })).
  // 5. Set options: randomizeOutputs: false, acceptDelayedBroadcast: false.
  // 6. Handle errors, including WERR_REVIEW_ACTIONS, and log detailed error information.
}

export async function loadCards(): Promise<CardData[]> {
    console.log('[loadCards] Fetching outputs from basket:', BASKET_NAME)

    try { // to fetch outputs
        const { outputs, BEEF } = await walletClient.listOutputs({
            basket: BASKET_NAME,
            include: 'entire transactions',
            includeCustomInstructions: true
        })

        console.log('[loadCards] Retreived outputs:', outputs.length)

        const cards = await Promise.all(  // process outputs as done in L7
            outputs.map(async (entry: any) => {
                try {
                    const [txid, voutStr] = entry.outpoint.split('.')
                    const outputIndex = parseInt(voutStr, 10)

                    if (!BEEF || isNaN(outputIndex)) return null

                    const tx = Transaction.fromBEEF(BEEF, txid)  // parse form beef and get locking script
                    const output = tx.outputs[outputIndex]
                    if (!output) return null

                    const lockingScript = output.lockingScript

                    const decoded = PushDrop.decode(lockingScript)  // decode for card attribs
                    const encodedAttributes = decoded.fields[0]

                    console.log('[loadCards] Decoding card from output:', entry.outpoint)

                    const attributesJSON = Utils.toUTF8(encodedAttributes) // parse json string
                    const attributes = JSON.parse(attributesJSON)

                    let keyID = ''  // extract keyID, history, and status + account for erros/null
                    let historyArray: HistoryEntry[] = []
                    let status: 'active' | 'redeemed' = 'active'

                    if (entry.customInstructions) {
                        try {
                            const instructions = JSON.parse(entry.customInstructions)
                            keyID = instructions.keyID || ''
                            historyArray = instructions.history || []   // refactor history & add status
                            status = instructions.status || 'active'
                        } catch (e) {
                            console.warn('[loadCards] Failed to parse customInstructions:', e)
                        }
                    }

                    const cardData: CardData = {  // build card-data obj (refactor history & add status)
                        name: attributes.name,
                        description: attributes.description,
                        rarity: attributes.rarity,
                        ability: attributes.ability,
                        history: historyArray,
                        sats: entry.satoshis,
                        txid: txid,
                        outputIndex: outputIndex,
                        outputScript: lockingScript.toHex(),
                        keyID: keyID,
                        status: status
                    }

                    console.log('[loadCards] Loaded card:', cardData.name)

                    return cardData

                } catch (err) {
                    console.warn('[loadCards] Failed to process entry:', entry, err)
                    return null
                }
            })
        )

        const filtered = cards.filter((c): c is CardData => c !== null)  // filter invalid entris & return list
        console.log('[loadCards] Final list of cards:', filtered.length)

        return filtered

    } catch (err) {
        console.error('[loadCards] Failed to load cards:', err)
        throw err
    }
  // TODO: Implement the logic to load collectible card tokens with fields: name, description, rarity, ability, history, sats:
  // 1. Use walletClient.listOutputs to fetch outputs from BASKET_NAME, including entire transactions and custom instructions.
  // 2. For each output, extract txid and outputIndex from the outpoint.
  // 3. Parse the transaction from BEEF data and get the locking script.
  // 4. Decode the PushDrop script to extract the encoded card attributes (JSON string).
  // 5. Parse the JSON string to retrieve name, description, rarity, and ability.
  // 6. Extract keyID and history from customInstructions (if available).
  // 7. Build a CardData object for each valid output, including satoshis, txid, outputIndex, outputScript, keyID, and history.
  // 8. Filter out invalid entries and return the list of CardData objects.

 // return [] -placeholder return list?
}

export async function redeemCard(card: CardData): Promise<void> {
    console.log('[redemmCard] Redeeming card:', card.name)

    try { // fetch card and parse retun data
        const { BEEF } = await walletClient.listOutputs({
            basket: BASKET_NAME,
            include: 'entire transactions'
        })

        if (!BEEF) throw new Error('BEEF data not found for transaction')

        const updatedHistory = [...card.history, createRedemptionHistoryEntry()]   // when redeemed -> add to history
        const lockingScript = LockingScript.fromHex(card.outputScript)

        const unlocker = pushdrop.unlock(
            PROTOCOL_ID,
            card.keyID,
            'self',  // unlock my own card
            'all',  // all fields
            false, // lockBit si false bc we're UNLOCKing
            card.sats,
            lockingScript
        )

        const partial = await walletClient.createAction({            // call Action with returned outputs
            description: `Redeem card: ${card.name}`,
            inputBEEF: BEEF,
            inputs: [
                {
                    outpoint: `${card.txid}.${card.outputIndex}`,
                    unlockingScriptLength: 73,
                    inputDescription: 'Collectable card token'
                }
            ],
            outputs: [          // redemption outputs
                {
                    lockingScript: lockingScript.toHex(),
                    satoshis: card.sats,
                    outputDescription: 'Redeemed collectable card token',
                    basket: BASKET_NAME,
                    customInstructions: JSON.stringify({
                        keyID: card.keyID,
                        history: updatedHistory,
                        status: 'redeemed'
                    })
                }
            ],
            options: {
                randomizeOutputs: false,
                acceptDelayedBroadcast: false
            }
        })

        const unlockingScript = await unlocker.sign(                // sign & submit 
            Transaction.fromBEEF(partial.signableTransaction!.tx),
            card.outputIndex
        )

        await walletClient.signAction({
            reference: partial.signableTransaction!.reference,
            spends: {
                [card.outputIndex]: {
                    unlockingScript: unlockingScript.toHex()
                }
            }
        })

        console.log('[redeemCard] Card redeemed successfully:', card.name)

    } catch (err: unknown) {                                        // handle all errors pattern
        if (err instanceof WERR_REVIEW_ACTIONS) {
            console.error('[redeemCard] Wallet threw WERR_REVIEW_ACTIONS:', {
                code: err.code,
                message: err.message,
                reviewActionResults: err.reviewActionResults,
                sendWithResults: err.sendWithResults,
                txid: err.txid,
                tx: err.tx,
                noSendChange: err.noSendChange
            })
        } else if (err instanceof Error) {
            console.error('[redeemCard] Redemption failed with error:', {
                message: err.message,
                name: err.name,
                stack: err.stack,
                error: err
            })
        } else {
            console.error('[redeemCard] Redemption failed with unknown error:', err)
        }
        
        throw err
    }
  // TODO: Implement the logic to redeem a collectible card token:
  // 1. Fetch BEEF data from walletClient.listOutputs for BASKET_NAME, including entire transactions.
  // 2. Parse the card’s outputScript into a LockingScript.
  // 3. Create an unlocker with pushdrop.unlock using PROTOCOL_ID, card.keyID, 'self', 'all', false, card.sats, and the parsed script.
  // 4. Call walletClient.createAction with the card’s outpoint, unlockingScriptLength: 73, and options: randomizeOutputs: false, acceptDelayedBroadcast: false.
  // 5. Sign the transaction using unlocker.sign and submit it via walletClient.signAction.
  // 6. Handle errors, including WERR_REVIEW_ACTIONS, and log detailed error information.
}

