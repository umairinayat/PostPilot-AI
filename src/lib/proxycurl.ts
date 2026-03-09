export interface ProxycurlProfile {
  full_name: string;
  headline: string;
  summary: string;
  experiences: ProxycurlExperience[];
  skills: string[];
  activities: ProxycurlActivity[];
}

interface ProxycurlExperience {
  title: string;
  company: string;
  description: string;
  starts_at: { day: number; month: number; year: number } | null;
  ends_at: { day: number; month: number; year: number } | null;
}

interface ProxycurlActivity {
  title: string;
  activity_status: string;
}

export async function scrapeLinkedInProfile(linkedinUrl: string): Promise<ProxycurlProfile> {
  const response = await fetch(
    `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(linkedinUrl)}&extra=include&personal_contact_number=exclude`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PROXYCURL_API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Proxycurl API error: ${error}`);
  }

  return response.json();
}
