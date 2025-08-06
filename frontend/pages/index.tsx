import { useAuth } from '../context/AuthContext';
import withAuth from '../utils/withAuth';
import Hero from '../components/shared/Hero';
import ActionItems from 'components/shared/ActionItems';
import FeatureList from '../components/shared/FeatureList';
import PrivacyBlurb from '../components/shared/PrivacyBlurb';

const Home = () => {
  const { loggedIn } = useAuth();

  return (
    <div>

      {loggedIn ? (
        <main className="flex-grow text-center px-6 py-20 bg-gray-50">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Welcome back!</h1>
          <p className="text-lg text-gray-600 mb-6">
            You are logged in. What would you like to do?
          </p>
          <ul className="space-y-4 text-blue-600 underline">
            <li><a href="/dashboard">Go to Dashboard</a></li>
            <li><a href="/logout">Logout</a></li>
          </ul>
        </main>
      ) : (
        <>
          <Hero />
          <ActionItems />
          <FeatureList />
          <PrivacyBlurb />
        </>
      )}
    </div>
  );
};

export default withAuth(Home);
