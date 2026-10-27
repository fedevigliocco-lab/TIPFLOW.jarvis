/** @type {import('next').NextConfig} */
const nextConfig = {
  // PGlite e postgres girano solo lato server.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
};

export default nextConfig;
