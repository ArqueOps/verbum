import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://verbum-two.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/estudos/*', '/blog'],
      disallow: ['/meus-estudos', '/perfil', '/admin', '/api/'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
