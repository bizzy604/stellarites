export const MOCK_PROFILES: Record<string, { name: string; role: string; rating: number; avatar: string; jobsCompleted?: number; jobsContracted?: number }> = {
    '1001': { name: 'Sarah Wilson', role: 'Domestic Worker', rating: 4.9, avatar: 'SW', jobsCompleted: 47 },
    '1002': { name: 'James Rodriquez', role: 'Domestic Worker', rating: 5.0, avatar: 'JR', jobsCompleted: 132 },
    '1003': { name: 'Emily Chen', role: 'Employer', rating: 4.7, avatar: 'EC', jobsContracted: 28 },
    '1004': { name: 'Michael Chang', role: 'Employer', rating: 4.8, avatar: 'MC', jobsContracted: 89 },
};
