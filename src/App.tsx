import { AssistantPage } from './components/AssistantPage';
import { AuthHandoffPage } from './components/AuthHandoffPage';
import { CampaignContentPage, ContentUnavailable } from './components/CampaignContentPage';

const campaignContentEnabled = import.meta.env.VITE_CAMPAIGN_CONTENT_ENABLED === 'true';

export function App() {
  if (window.location.pathname === '/auth/handoff') {
    return <AuthHandoffPage />;
  }
  if (window.location.pathname === '/campaign-content') {
    return campaignContentEnabled
      ? <CampaignContentPage />
      : <ContentUnavailable message="O conteúdo de campanha com IA está indisponível neste ambiente." />;
  }
  return <AssistantPage />;
}
