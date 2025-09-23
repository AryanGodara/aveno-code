# Aveno - Wallet-Gated Deployment Platform

A minimal Next.js application with Sui wallet integration, featuring a deployment dashboard with two distinct visual themes: Neon and Neo-Brutalism.

## Features

- **Wallet-Gated Access**: Connect with Sui, Suiet, or other supported wallets
- **Theme System**: Toggle between Neon (vibrant glow effects) and Neo-Brutalism (bold, chunky design)
- **Deployment Dashboard**: Manage deployments with a clean interface
- **Quick Deploy**: Simulated GitHub integration for rapid deployment

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **Wallet Integration**: Mysten dapp-kit for Sui blockchain
- **State Management**: React Query
- **Typography**: Custom font stacks per theme (Syne, Sora, Plus Jakarta Sans, Inter, JetBrains Mono)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Theme System

### Neon Theme
- Electric cyan, acid green, and magenta accents
- Glowing effects on interactive elements
- Syne font for display text

### Neo-Brutalism Theme
- High-contrast black/white with bold green accent
- Thick borders and hard drop shadows
- Plus Jakarta Sans for display text

## Project Structure

```
src/
├── app/
│   ├── page.tsx           # Wallet gate page
│   ├── dashboard/         # Protected dashboard routes
│   ├── providers.tsx      # Wallet and query providers
│   └── globals.css        # Theme styles
├── components/
│   ├── wallet-*.tsx       # Wallet connection components
│   ├── dashboard-*.tsx    # Dashboard UI components
│   ├── theme-*.tsx        # Theme system components
│   └── ui/               # shadcn/ui components
```

## Environment

This app is configured to connect to Sui testnet by default. No additional environment variables are required.

## Building for Production

```bash
npm run build
npm start
```

## License

MIT