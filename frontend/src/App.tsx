import React, { useEffect, useState } from 'react'
import {
    Container,
    Typography,
    Button,
    Box,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    List,
    ListItem,
    ListItemText,
    CircularProgress,
    Chip,
    ThemeProvider,
    CssBaseline,
    Dialog
 } from '@mui/material'
import { createCard, loadCards, redeemCard, tradeCard, CardData } from './CardManager'
import web3Theme, { rarityColors } from './Utils/theme'
import Footer from './Utils/footer'

const App: React.FC = () => {               // set form state
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [rarity, setRarity] = useState('common')
    const [ability, setAbility] = useState('')
  //  const [history, setHistory] = useState('')
    const [sats, setSats] = useState(100)

    const [cards, setCards] = useState<CardData[]>([])          // set App state
    const [loading, setLoading] = useState(false)
    const [creating, setCreating] = useState(false)
    const [redeemingIndex, setRedeemingIndex] = useState<number | null>(null)
    const [status, setStatus] = useState('')

    const [tradingIndex, setTradingIndex] = useState<number | null>(null)        // set Trading & modal states
    const [tradeModalOpen, setTradeModalOpen] = useState(false)
    const [buyerKeyID, setBuyerKeyID] = useState('')
    const [tradePrice, setTradePrice] = useState(100)

    const abbreviateKeyID = (keyID: string): string => {        // abbreviate counterparty ID key
      return keyID.substring(0, 4) + '...'
    }

    const getTradeStatus = (card: CardData): 'SOLD' | 'BOUGHT' | null => {
      const lastTrade = [...card.history]
        .reverse()                                    // flip order to descending
        .find(entry => entry.event === 'Traded')

      if (!lastTrade?.metadata) return null 
        
      if (lastTrade.metadata.tradedFrom === card.keyID) {
        return 'SOLD'
      }

      if (lastTrade.metadata.tradedTo === card.keyID) {
        return 'BOUGHT'
      }

      return null
    }


    const fetchCards = async () => {
        setLoading(true)
        setStatus('Loading cards...')
        try{
            const result = await loadCards()
            setCards(result)
            setStatus('')
        } catch (err: any) {
            console.error(err)
            setStatus('Failed to load cards')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateCard = async () => {          // create card & validate form entry data
        if (!name.trim()) {
            setStatus('Card name is required')
            return
        }
        if (!description.trim()) {
            setStatus('Description is required')
            return
        }
        if (!ability.trim()) {
            setStatus('Ability is required')
            return
        }
        if (sats <= 0) {
            setStatus('Satoshis must be greater than 0')
            return
        }

        setCreating(true)
        setStatus('Creating card...')

        try {
            await createCard({
                name: name.trim(),
                description: description.trim(),
                rarity,
                ability: ability.trim(),
            //    history: history.trim(),
                sats
            })

            setName('')
            setDescription('')
            setRarity('common')
            setAbility('')
        //    setHistory('')
            setSats(100)

            setStatus('Card created successfully!')
            await fetchCards()
            
        } catch (err: any) {
            console.error(err)
            const message = err.message || 'Unknown error'
            setStatus(`Failed to create card: ${message}. Check Metanet Client connectivity.`)
        } finally {
            setCreating(false)  
        }
    }

    const handleRedeem = async (idx: number) => {
        const card = cards[idx]
        if (!card) {
            setStatus('Card not found')
            return
        }

        if (card.status === 'redeemed') {      // add already redeemed check & notify
          setStatus('This card is inactive and cannot be redeemed')
          return
        }

        setRedeemingIndex(idx)
        setStatus('Redeeming card...')

        try {
            await redeemCard(card)
            setStatus('Card redeemed successfully!')
            await fetchCards()
        } catch (err: any) {
            console.error(err)
            const message = err.message || 'Unknown error'
            setStatus(`Failed to redeem card: ${message}`)
        } finally {
            setRedeemingIndex(null)
        }
    }

    const handleTrade = async () => {
      if (tradingIndex === null) return      // make sure there are trades
      
      const  card = cards[tradingIndex]
      if (!card) {
        setStatus('Card not found')
        return
      }

      if (!buyerKeyID.trim()) {
        setStatus('Buyer\'s ID key is required')
        return
      }
      if (tradePrice <= 0) {
        setStatus('Price must be greater than 0')
        return
      }

      setStatus('Executing trade...')     // notify

      try {
        await tradeCard(card, buyerKeyID.trim(), tradePrice)    // process trade
        setStatus('Trade successful!')

        setTimeout(() => {                // pause for user notification then close trading modal
          setTradeModalOpen(false)
          setBuyerKeyID('')             // clear input key
          setTradePrice(100)            // todo: value calcs & swap
          setTradingIndex(null)
          setStatus('')
          fetchCards()                //Refresh card list post-trade
        }, 2000)    // 2sec pause

      } catch (err: any) {
        console.error(err)
        const message = err.message || 'Unknown'
        setStatus(`Failed to execute trade: ${message}`)
      }
    }

    useEffect(() => {
        fetchCards()
    }, [])

      // TODO: Implement the UI and logic for the Collectible Card Creator with fields: name, description, rarity, ability, history, sats:
  // 1. Create state variables for card attributes (name: string, description: string, rarity: string, ability: string, history: string, sats: number) and loading state.
  // 2. Implement a form with inputs for card attributes (e.g., text fields for name, description, ability, history; a dropdown for rarity with options like "common", "rare", "epic", "legendary"; a number input for sats).
  // 3. Add a "Create Card" button that calls createCard with the form data, validates inputs (e.g., non-empty name, description, rarity, ability; sats > 0), and refreshes the card list on success.
  // 4. Load cards on mount using loadCards and display them in a list or grid, showing attributes: name, description, rarity, ability, history (if present), and sats.
  // 5. Add a "Redeem" button for each card that calls redeemCard and refreshes the list on success.
  // 6. Include loading indicators and user-friendly error messages (e.g., alerts or status text) for create and redeem operations.
  // 7. Style the UI with Material-UI in dark mode, ensuring responsiveness and accessibility.
  // 8. Customize the layout, add features (e.g., card images, filters, or trading), or enhance the design to make it your own.

  return (
    <ThemeProvider theme={web3Theme}>
      <CssBaseline />
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Lab L-8: Collectible Card Creator
        </Typography>

        <Box sx={{ mt: 4, mb: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Create New Card
          </Typography>

          <TextField
            fullWidth
            label="Card Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
            multiline
            rows={2}
            required
          />

          <FormControl fullWidth margin="normal" required>
            <InputLabel>Rarity</InputLabel>
            <Select
              value={rarity}
              label="Rarity"
              onChange={(e) => setRarity(e.target.value)}
            >
              <MenuItem value="common">Common</MenuItem>
              <MenuItem value="rare">Rare</MenuItem>
              <MenuItem value="epic">Epic</MenuItem>
              <MenuItem value="legendary">Legendary</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Ability"
            value={ability}
            onChange={(e) => setAbility(e.target.value)}
            margin="normal"
            required
          />

          {/* <TextField
            fullWidth
            label="History (Optional)"
            value={history}
            onChange={(e) => setHistory(e.target.value)}
            margin="normal"
            multiline
            rows={2}
          /> */}

          <TextField
            fullWidth
            type="number"
            label="Satoshis"
            value={sats}
            onChange={(e) => setSats(parseInt(e.target.value) || 0)}
            margin="normal"
            required
          />

          <Button
            fullWidth
            variant="contained"
            onClick={handleCreateCard}
            disabled={creating}
            sx={{ mt: 2 }}
          >
            {creating ? 'Creating...' : 'Create Card'}
          </Button>
        </Box>

        {status && (
          <Typography
            variant="body2"
            color={status.includes('success') ? 'success.main' : 'error.main'}
            sx={{ mb: 2 }}
          >
            {status}
          </Typography>
        )}

        <Dialog
          open={tradeModalOpen}
          onClose={() => {                // clear & close modal
            setTradeModalOpen(false)
            setBuyerKeyID('')
            setTradePrice(100)
            setTradingIndex(null)
          }}
          maxWidth="sm"
          fullWidth
        >
          <Box sx={{ p:3, bgcolor: 'background.paper' }}>
            <Typography variant="h6" gutterBottom>
              Trade Card
            </Typography>

            <TextField
              fullWidth
              label="BuyerKeyID"
              value={buyerKeyID}
              onChange={(e) => setBuyerKeyID(e.target.value)}
              margin="normal"
              required
              placeholder="Enter buyer's keyID"
            />

            <TextField
              fullWidth
              type="number"
              label="Price (sats)"
              value={tradePrice}
              onChange={(e) => setTradePrice(parseInt(e.target.value) || 0)}
              margin="normal"
              required
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setTradeModalOpen(false)        // close & clear modal
                  setBuyerKeyID('')
                  setTradePrice(100)
                  setTradingIndex(null)
                }}
                fullWidth
              >
                Cancel
              </Button>

              <Button
                variant="contained"
                color="primary"
                onClick={handleTrade}     // execute trade
                disabled={!buyerKeyID.trim() || tradePrice <= 0}
                fullWidth
              >
                Confirm Trade
              </Button>
            </Box>
          </Box>
        </Dialog>

        {loading ? (
          <Box display="flex" justifyContent="center" sx={{ my: 4 }}>
            <CircularProgress />
          </Box>
        ) : cards.length === 0 ? (
          <Typography align="center" color="textSecondary">
            No cards found. Create your first card!
          </Typography>
        ) : (
            <Box>
              <Typography variant="h6" gutterBottom>
                Your Cards ({cards.length})
              </Typography>
              <List>
                {cards.map((card, idx) => (
                    <ListItem
                      key={idx}
                      sx={{
                        bgcolor: 'background.paper',
                        mb: 2,
                        borderRadius: 1,
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        opacity: (card.status === 'redeemed' || getTradeStatus(card) === 'SOLD') ? 0.6 : 1     // grey out redeemed & sold cards
                      }}

                      secondaryAction={
                        (() => {
                          const tradeStatus = getTradeStatus(card)

                          if (tradeStatus === 'SOLD') {       // show disabled SOLD button
                            return (
                              <Button
                                variant="outlined"
                                disabled={true}
                                sx={{ mt: 1 }}
                              >
                                SOLD
                              </Button>
                            )
                          }

                        if (card.status === 'active') {     // show TRADE and REDEEM buttons stacked
                          return (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>

                              <Button     // TRADE
                                variant="outlined"
                                color="primary"
                                onClick={() => {
                                  setTradingIndex(idx)        // grab card to trade
                                  setTradeModalOpen(true)     // open modal with card loaded
                                }}
                                disabled={tradingIndex !== null || redeemingIndex !== null}    // disable executing action 
                                fullWidth
                              >
                                Trade   
                              </Button>
                              
                              <Button     // REDEEM
                                variant="outlined"
                                color="error"
                                onClick={() => handleRedeem(idx)}
                                disabled={redeemingIndex !== null || tradingIndex !== null}
                                fullWidth
                              >
                                {redeemingIndex === idx ? 'Redeeming...' : 'Redeem'}
                              </Button>
                            </Box>
                        )
                      }



                      return null
                      })()
                    } 
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, width: '100%' }}>
                          <Typography variant="h6">
                            {card.name}
                          </Typography>
                          <Chip
                            label={card.rarity.toUpperCase()}
                            color={rarityColors[card.rarity]}
                            size="small"
                          />

                          {(() => {
                            const tradeStatus = getTradeStatus(card)
                            if (tradeStatus) {                          // only show if it's been traded
                              return (
                                <Chip
                                  label={tradeStatus}
                                  color={tradeStatus === 'SOLD' ? 'warning' : 'info'}     // color badge based direction
                                  size="small"                                                // -Bought gets 'info' (ie: NOT 'sold')
                                  variant="outlined"
                                />
                              )
                            }
                            return null
                          })()}

                          {card.status === 'redeemed' && (    //  add "inactive" display element
                            <Chip
                              label="REDEEMED"
                              color="default"
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>

                        <ListItemText
                          primary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                            {card.description}
                            </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          <strong>Ability:</strong> {card.ability}
                        </Typography>

                        {card.history && card.history.length > 0 && (      // new display for history array eleemnt
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2">
                              <strong>History:</strong>
                            </Typography>

                            {card.history.map((entry, entryIdx) => {
                              const formattedDate = new Date(entry.timestamp).toLocaleString()

                              if (entry.event === 'Created' || entry.event === 'Redeemed') {      // create/redeem events
                                return (
                                  <Typography
                                    key={entryIdx}
                                    variant="body2"
                                    color="textSecondary"
                                    sx={{ ml: 2, mt: 0.5 }}
                                  >
                                    * {entry.event} = {formattedDate}
                                  </Typography>
                                )
                              }

                              if (entry.event === 'Traded' && entry.metadata) {       // trading event
                                const isBuyer = entry.metadata.tradedTo === card.keyID
                                const counterpartyKeyID = isBuyer
                                  ? entry.metadata.tradedFrom
                                  : entry.metadata.tradedTo
                                const actionText = isBuyer ? 'Bought from Seller' : 'Sold to Buyer'

                                return (
                                  <Box key={entryIdx} sx={{ ml: 2, mt: 0.5 }}>
                                    <Typography variant="body2" color="textSecondary">
                                      • Traded - {formattedDate}
                                    </Typography>
                                    {counterpartyKeyID && entry.metadata.price !== undefined && (
                                      <Typography
                                        variant="body2"
                                        color="textSecondary"
                                        sx={{ ml: 2 }}
                                      >
                                        {actionText}: {counterpartyKeyID.substring(0, 8)}... for {entry.metadata.price} sats
                                      </Typography>
                                    )}
                                  </Box>
                                )
                              }
                            return (                             // fallback for any ohter 'event's
                              <Typography
                                key={entryIdx}
                                variant="body2"
                                color="textSecondary"
                                sx={{ ml: 2, mt: 0.5 }}
                              >
                                * {entry.event} - {formattedDate}
                                </Typography>
                              )
                            })}
                          </Box>
                        )}

                        <Typography variant="body2" sx={{ mt: 1 }}>
                          💰 <strong>{card.sats} sats</strong>
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Container>
      <Footer />
    </ThemeProvider>
  )
}

export default App