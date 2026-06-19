/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL:  process.env.NEXT_PUBLIC_API_URL  || "http://localhost:8000/api/v1",
    NEXT_PUBLIC_APP_NAME: "EduContas ERP",
  },
};

module.exports = nextConfig;
