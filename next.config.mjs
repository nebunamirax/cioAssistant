/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@kutalia/whisper-node-addon", "@blocknote/core", "@blocknote/react", "@blocknote/server-util"]
};

export default nextConfig;
