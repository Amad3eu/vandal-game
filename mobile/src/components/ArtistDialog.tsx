import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ARTIST_INFO, type GraffitiArtist } from '../shared'

interface ArtistDialogProps {
  artist: GraffitiArtist
  /** Called when the player takes the artist's signature for the blackbook. */
  onAccept: () => void
  onClose: () => void
}

/**
 * Meeting a graffiti artist pauses the run. As on the web, accepting puts the artist's
 * signature in the blackbook; drawing your own (and its +150 points) isn't in the app yet.
 */
export default function ArtistDialog({ artist, onAccept, onClose }: ArtistDialogProps) {
  const info = ARTIST_INFO[artist]
  const [accepted, setAccepted] = useState(false)

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={[styles.avatar, { backgroundColor: info.color }]} />
        <Text style={styles.name}>{info.name}</Text>
        <Text style={styles.quote}>{info.description}</Text>
        {accepted ? (
          <>
            <Text style={styles.question}>A assinatura de {info.name} foi para o seu blackbook.</Text>
            <Pressable testID="artist-continue" style={[styles.button, styles.yes]} onPress={onClose}>
              <Text style={styles.buttonText}>CONTINUAR</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.question}>Quer trocar uma assinatura comigo?</Text>
            <View style={styles.row}>
              <Pressable
                testID="artist-yes"
                style={[styles.button, styles.yes]}
                onPress={() => {
                  onAccept()
                  setAccepted(true)
                }}
              >
                <Text style={styles.buttonText}>SIM</Text>
              </Pressable>
              <Pressable testID="artist-no" style={[styles.button, styles.no]} onPress={onClose}>
                <Text style={[styles.buttonText, styles.noText]}>NÃO</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
  },
  quote: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  question: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 6,
  },
  yes: {
    backgroundColor: '#667eea',
  },
  no: {
    backgroundColor: '#f0f0f0',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  noText: {
    color: '#333',
  },
})
