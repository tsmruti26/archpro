# Archpro

Archive and track AI project timelines across Claude, ChatGPT, Gemini.

## Installation

### Clone Repository

```bash
git clone https://github.com/tsmruti26/archpro.git
cd archpro
```

### Load Extension

1. Open Chrome: `chrome://extensions/`
2. Enable Developer Mode (top right)
3. Click "Load unpacked" → Select the archpro folder
4. Extension loads

### Start Backend

```bash
cd ai-project-log-backend
mvn spring-boot:run
```

## Features

- Quick logging with auto-captured chat links
- Project dashboard with search
- Checkpoint timeline per project
- Offline sync
- Local storage with optional server sync

## Tech Stack

- JavaScript, HTML, CSS
- Chrome Storage API
- Spring Boot, H2 Database
- Maven

## License

MIT