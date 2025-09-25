# Authentication Setup

Nebius CLI supports two main authentication methods to access AI models. Choose the method that best fits your use case:

**Nebius OAuth (Recommended):**
  - Use this option to log in with your nebius account.
  - During initial startup, Nebius CLI will direct you to the nebius.ai authentication page. Once authenticated, your credentials will be cached locally so the web login can be skipped on subsequent runs.
  - **Requirements:**
    - Valid nebius account
    - Internet connection for initial authentication
  - **Benefits:**
    - Seamless access to Nebius models
    - Automatic credential refresh
    - No manual API key management required

  **Getting Started:**

  ```bash
  # Start Nebius CLI and follow the OAuth flow
  nebius
  ```

  The CLI will automatically guide you through the authentication process.
