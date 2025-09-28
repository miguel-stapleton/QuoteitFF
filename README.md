# Fresh Faced Quoter

A responsive single-page wedding quote application built with React, TypeScript, and Vite.

## Features

- **Three UI States**: Form → Price Confirmation → Quote Result
- **Mobile-First Design**: Optimized for mobile devices with large, accessible inputs
- **Light/Dark Theme**: Toggle between light and dark modes
- **Sticky Bottom CTA**: Primary action button always visible
- **Accessible**: Proper labels, focus states, and keyboard navigation
- **Quote Calculation**: Dynamic pricing based on services, guest count, and venue type
- **Export Options**: Download or email quotes

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/          # React components
│   ├── QuoteForm.tsx   # Initial form state
│   ├── PriceConfirmation.tsx  # Confirmation state
│   ├── QuoteResult.tsx # Final quote display
│   ├── ProgressIndicator.tsx  # Step indicator
│   └── ThemeToggle.tsx # Light/dark theme toggle
├── hooks/              # Custom React hooks
│   └── useTheme.ts     # Theme management
├── utils/              # Utility functions
│   └── quoteCalculator.ts  # Quote calculation logic
├── data/               # Static data
│   └── services.ts     # Service options and pricing
├── types.ts            # TypeScript type definitions
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles and CSS variables
```

## Services Included

- Wedding Photography
- Wedding Videography
- Catering Services
- Floral Arrangements
- DJ & Music
- Wedding Planning

## Pricing Factors

- Base service fee
- Selected services
- Guest count multipliers
- Venue type multipliers (Indoor, Outdoor, Destination, Luxury)

## Accessibility Features

- Large touch targets (minimum 44px)
- High contrast colors
- Keyboard navigation support
- Screen reader friendly labels
- Focus indicators
- Reduced motion support

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is licensed under the MIT License.
