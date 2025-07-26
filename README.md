# GetMovify 🎬

An open-source movie discovery and streaming platform built with Next.js. Browse, search, and discover movies across different categories with a modern, responsive interface.

**Live Demo:** [https://getmovify.vercel.app/](https://getmovify.vercel.app/)

## Features

- 🔍 **Advanced Search** - Search movies by title with real-time results
- 📱 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- 🎭 **Category Browsing** - Explore movies by genres and categories
- ⚡ **Infinite Scroll** - Smooth pagination with infinite loading
- 🎨 **Modern UI** - Clean, dark theme with smooth animations
- 📊 **Movie Details** - Comprehensive movie information including ratings, cast, and synopsis
- 🚀 **Fast Performance** - Optimized with Next.js 15 and React Query

## Tech Stack

- **Frontend:** Next.js 15, React 18, TypeScript
- **Styling:** Tailwind CSS
- **State Management:** TanStack Query (React Query)
- **Deployment:** Vercel
- **Data Fetching:** Custom scraping utilities with retry logic

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Local Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/fabwaseem/getmovify.git
   cd getmovify
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Run the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── category/          # Category pages
│   └── page.tsx           # Home page
├── components/            # Reusable React components
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions and scrapers
└── config/                # Configuration files
```

## Contributing

We welcome contributions from the community! Here's how you can help:

### Ways to Contribute

- 🐛 **Bug Reports** - Found a bug? Please open an issue
- 💡 **Feature Requests** - Have an idea? We'd love to hear it
- 🔧 **Code Contributions** - Submit pull requests for bug fixes or new features
- 📖 **Documentation** - Help improve our docs
- 🎨 **UI/UX Improvements** - Make the app more beautiful and user-friendly

### Development Guidelines

1. **Fork the repository** and create your feature branch

   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes** following our coding standards:

   - Use TypeScript for type safety
   - Follow the existing code style
   - Add comments for complex logic
   - Ensure responsive design

3. **Test your changes** thoroughly

   ```bash
   npm run build
   npm run lint
   ```

4. **Commit your changes** with a descriptive message

   ```bash
   git commit -m "Add amazing feature"
   ```

5. **Push to your branch** and open a Pull Request
   ```bash
   git push origin feature/amazing-feature
   ```

### Pull Request Guidelines

- Provide a clear description of the changes
- Include screenshots for UI changes
- Ensure all tests pass
- Keep PRs focused and atomic
- Reference any related issues

## Bug Reports & Issues

If you encounter any bugs or issues:

1. **Check existing issues** to avoid duplicates
2. **Provide detailed information**:

   - Steps to reproduce
   - Expected vs actual behavior
   - Browser and device information
   - Screenshots if applicable

3. **Use issue templates** when available
4. **Be respectful** and constructive in discussions

## Roadmap

- [ ] User authentication and profiles
- [ ] Watchlist and favorites
- [ ] Movie recommendations
- [ ] Advanced filtering options
- [ ] Offline support
- [ ] Mobile app (React Native)

## License

This project is open source and available under the [MIT License](LICENSE).

## Creator

**Waseem Anjum**

- Website: [waseemanjum.com](https://waseemanjum.com)
- GitHub: [@waseemanjum](https://github.com/waseemanjum)

## Support

If you find this project helpful, please consider:

- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting new features
- 🤝 Contributing to the codebase

---

Made with ❤️ by [Waseem Anjum](https://waseemanjum.com)
