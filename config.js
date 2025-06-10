// Load environment variables
const loadEnv = async () => {
    try {
        // Check if we're in production (Vercel)
        if (window.location.hostname.includes('vercel.app')) {
            // In production, the API key should be set as an environment variable
            window.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
            return;
        }

        // In development, try to load from .env file
        const response = await fetch('/.env');
        const text = await response.text();
        const env = {};
        text.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                env[key.trim()] = value.trim();
            }
        });
        window.OPENAI_API_KEY = env.OPENAI_API_KEY;
    } catch (error) {
        console.error('Error loading environment variables:', error);
        // If we can't load the .env file, check if the key is set in the window object
        if (!window.OPENAI_API_KEY) {
            console.warn('OpenAI API key not found. Please set it in your environment variables or .env file.');
        }
    }
};

// Call this before your app initializes
loadEnv();
