<div align="center">

# AnswerGit 🤖

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.17-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

🚀 AI-Powered GitHub Repository Explorer | Understand codebases instantly with AI-driven insights

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Configuration](#configuration)


</div>

## 🌟 Features

- 🤖 **AI-Powered Analysis**: Leverages Google's Gemini AI to provide intelligent insights about repositories
- 📁 **Smart File Explorer**: Navigate through repository files with ease
- 💬 **Interactive Chat**: Ask questions about the codebase and get detailed responses
- 🎨 **Modern UI**: Beautiful dark-mode interface built with TailwindCSS
- 🔄 **Real-time Updates**: Instant responses and updates as you explore
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🚀 Installation

1. **Clone the repository**
```bash
git clone https://github.com/TharaneshA/answergit.git
cd answergit
```

2. **Install dependencies**
```bash
pnpm install
# or
npm install
# or
yarn install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory with the following variables:
```env
GEMINI_API_KEY=your_gemini_api_key
GITHUB_TOKEN=your_github_token
```

## 🔧 Configuration

The project uses several key dependencies:

- **Next.js** for the framework
- **React** for the UI
- **TailwindCSS** for styling
- **Google Generative AI** for AI features
- **GitHub API** for repository interaction

Customize the application by modifying:
- `tailwind.config.ts` for styling
- `components.json` for UI component settings
- `app/globals.css` for global styles

## 🚀 Usage

1. **Start the development server**
```bash
pnpm dev
# or
npm run dev
# or
yarn dev
```

2. **Open your browser**
Navigate to `http://localhost:3000`

3. **Enter a GitHub repository**
Enter the username and repository name to start exploring

## 💡 Key Features Usage

### AI Assistant
Use the AI assistant to:
- Analyze code structure
- Understand dependencies
- Get code explanations
- Generate test suggestions

### File Explorer
- Navigate through repository files
- View file contents
- Get AI-powered insights for specific files

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- AI powered by [Google Gemini](https://deepmind.google/technologies/gemini/)

---

<div align="center">
Made with ❤️
</div>
