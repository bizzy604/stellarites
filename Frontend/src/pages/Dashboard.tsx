import { useState } from 'react';
import WorkerDashboard from './WorkerDashboard';
import EmployerDashboard from './EmployerDashboard';

export default function Dashboard() {
    const [role] = useState<'worker' | 'employer'>(() => {
        return (localStorage.getItem('paytrace_role') as 'worker' | 'employer') || 'worker';
    });

    if (role === 'employer') {
        return <EmployerDashboard />;
    }

    return <WorkerDashboard />;
}
