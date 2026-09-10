# Deposito Auto — versione per iPhone

Questa cartella è **generata**: è la stessa app che sul telefono Android gira
dentro l'APK, servita come pagina web perché su iOS non esiste l'equivalente
dell'APK. Si compila con `npm run web` nel progetto e si pubblica con
`npm run pages`. Non si modifica niente qui dentro: le modifiche si fanno
nel progetto, in `src/mobile/` e `src/shared/`.

## Come si installa sull'iPhone

1. Apri **https://amberjackfiumicino-glitch.github.io/deposito-auto-iphone/** con **Safari** (deve essere Safari).
2. Tocca **Condividi** (il quadrato con la freccia).
3. **Aggiungi a Home**.

Poi si apre dall'icona, a tutto schermo. L'accesso è la stessa email e
password del computer.

I dati del deposito **non stanno qui**: vivono su un database protetto da
password e da regole per riga (RLS). Qui c'è solo l'interfaccia.
