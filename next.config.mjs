// Lets phones on the local network load the dev server (e.g. testing the
// mobile layout at http://192.168.x.x:3000). Dev-only; ignored in production.
const nextConfig = {
  allowedDevOrigins: ['192.168.*.*'],
}

export default nextConfig
