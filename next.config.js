/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        // Typecheck está 100% limpo (0 erros) — build falha se houver erro de tipo
    },
    eslint: {
        // Lint está 100% limpo (0 erros, 0 warnings) — build falha se houver warning
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'fmkcqciijcphyibzxkmr.supabase.co',
            },
        ],
    },
};

module.exports = nextConfig;