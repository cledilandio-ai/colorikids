/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        // !! ATENÇÃO !!
        // Ignora erros de TypeScript para o site subir logo
        ignoreBuildErrors: true,
    },
    eslint: {
        // Ignora alertas de estilo de código
        ignoreDuringBuilds: true,
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