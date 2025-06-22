# Water Watch Dashboard

A modern, interactive dashboard for visualizing and forecasting water consumption and related metrics. Built with Vite, React, TypeScript, shadcn-ui, and Tailwind CSS.

## Features

- Upload and visualize water consumption data by location and metric
- Interactive charts and tables
- Forecasting with confidence intervals and anomaly detection
- Responsive design for desktop and mobile

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd water-watch-dashboard-app-a63f9211

# Install dependencies
npm install
```

### Development

Start the development server with hot reloading:

```sh
npm run dev
```

The app will be available at `http://localhost:8080` (or the port shown in your terminal).

### Building for Production

To build the app for production:

```sh
npm run build
```

The output will be in the `dist/` directory.

### Preview Production Build

To locally preview the production build:

```sh
npm run preview
```

## Deployment

This project is ready for deployment to static hosting services such as GitHub Pages, Vercel, Netlify, or your own server.

### Deploying to GitHub Pages

1. Ensure the `base` option in `vite.config.ts` matches your repository name (already set for this project).
2. Push your code to GitHub.
3. GitHub Actions will automatically build and deploy your site to GitHub Pages on every push to the `main` branch.
4. Enable GitHub Pages in your repository settings and set the source to "GitHub Actions".

## Technologies Used

- [Vite](https://vitejs.dev/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

## Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements and bug fixes.

## License

This project is licensed under the MIT License.
