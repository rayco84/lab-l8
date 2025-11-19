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
    CssBaseline
 } from '@mui/material'
import { createCard, loadCards, redeemCard, CardData } from './CardManager'
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
                        opacity: card.status === 'redeemed' ? 0.6 : 1     // grey out redeemed cards in display
                      }}
                      secondaryAction={
                        card.status === 'active' && (
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => handleRedeem(idx)}
                            disabled={redeemingIndex !== null}    // disable while a redemption is happening 
                            sx={{ mt: 1 }}
                          >
                            {redeemingIndex === idx ? 'Redeeming...' : 'Redeem'}   
                          </Button>
                        )
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
                          {card.status === 'redeemed' && (    //  add "inactive" display element
                            <Chip
                              label="INACTIVE"
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
                            {card.history.map((entry, entryIdx) => (
                              <Typography
                                key={entryIdx}
                                variant="body2"
                                color="textSecondary"
                                sx={{ ml: 2, mt: 0.5 }}
                              >
                                * {new Date(entry.timestamp).toLocaleString()} - {entry.event}
                              </Typography>
                            ))}
                          </Box>
                        )}

                        {/* {card.history && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>History:</strong> {card.history}
                          </Typography>
                        )} */}

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