import { useEffect, useState } from 'react';
import WorkerDashboard from './WorkerDashboard';
import EmployerDashboard from './EmployerDashboard';

export default function Dashboard() {
    const [role, setRole] = useState<'worker' | 'employer'>('worker');

    useEffect(() => {
        const storedRole = localStorage.getItem('paytrace_role') as 'worker' | 'employer';
        if (storedRole) {
            setRole(storedRole);
        }
    }, []);

    if (role === 'employer') {
        return <EmployerDashboard />;
    }

    return <WorkerDashboard />;
}
