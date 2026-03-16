/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@kutalia/whisper-node-addon"]
  }
};

export default nextConfig;
