import { Navigate } from 'react-router-dom';
import { getSession } from '../services/session';
import WorkerDashboard from './WorkerDashboard';
import EmployerDashboard from './EmployerDashboard';

export default function Dashboard() {
    const session = getSession();

    // Not logged in → redirect to sign-in
    if (!session) {
        return <Navigate to="/auth/signin" replace />;
    }

    if (session.role === 'employer') {
        return <EmployerDashboard />;
    }

    return <WorkerDashboard />;
}
