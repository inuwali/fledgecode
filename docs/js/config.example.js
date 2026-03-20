/**
 * Application Configuration
 *
 * Copy this file to config.js and fill in your values:
 *   cp docs/js/config.example.js docs/js/config.js
 *
 * config.js is gitignored — it will not be committed.
 */

const config = {
    // REQUIRED: Your Vercel proxy base URL (no trailing slash)
    // Deploy the /vercel directory to your own Vercel project, then paste the URL here.
    // Example: 'https://my-fledgecode-proxy.vercel.app/api'
    apiBaseUrl: '',

    // OPTIONAL: Umami analytics (remove or leave empty to disable)
    analytics: {
        src: '',         // e.g. 'https://cloud.umami.is/script.js'
        websiteId: '',   // e.g. 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
        domains: ''      // e.g. 'mysite.github.io'
    },

    // OPTIONAL: Feedback form URL (remove or leave empty to hide the button)
    feedbackUrl: ''
};

export default config;
