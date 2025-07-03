import withAuth from '../utils/withAuth';

const Dashboard = () => {
  return <div>Welcome to the dashboard!</div>;
};

export default withAuth(Dashboard);