import EmailNotificationSettings from '../components/Emailnotificationsettings';

export default function Settings() {
  return (
    <div className="min-h-screen bg-parchment-dark p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-cinzel text-gold mb-8">Settings</h1>
        
        {/* Email Notifications Toggle */}
        <EmailNotificationSettings />
        
        {/* Add other settings here */}
      </div>
    </div>
  );
}