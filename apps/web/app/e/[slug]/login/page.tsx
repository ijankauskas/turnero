import { LoginForm } from '../../../../components/login-form';
import { apiBase } from '../../../../lib/session';

type Branding = {
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
};

export default async function SlugLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let branding: Branding | null = null;
  try {
    const response = await fetch(`${apiBase}/public/company/${slug}`, {
      cache: 'no-store',
    });
    if (response.ok) {
      branding = (await response.json()) as Branding;
    }
  } catch {
    branding = null;
  }

  return <LoginForm initialSlug={slug} branding={branding} />;
}
