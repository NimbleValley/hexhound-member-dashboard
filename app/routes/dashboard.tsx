import { AlarmClockMinus, AlarmClockPlus, Coins, Crosshair, Hourglass, Tally5, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { data, useNavigate } from "react-router";
import { BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, ResponsiveContainer, Label } from "recharts";
import { supabase, TBA_API_KEY } from "public/supabase";
import { getWeeksSince } from "public/util";
import type { PredictionStats, TBAMatchOutcome, WeekHourLog } from "public/types";

export default function Dashboard() {
    const navigate = useNavigate();
    const [memberData, setMemberData] = useState(null);
    const [timeEntries, setTimeEntries] = useState<any[]>([]);
    const [matchEntries, setMatchEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isClockedIn, setIsClockedIn] = useState<boolean | null>(null);
    const [totalHours, setTotalHours] = useState<number>(0);
    const [weekHours, setWeekHours] = useState<WeekHourLog[]>([]);
    const [totalMatchesScouted, setTotalMatchesScouted] = useState<number>(0);
    const [totalPointsScouted, setTotalPointsScouted] = useState<number>(0);
    const [predictionStats, setPredictionStats] = useState<PredictionStats | null>(null);
    const [mostScoutedTeam, setMostScoutedTeam] = useState<number>(0);

    const [tbaOutcomes, setTBAOutcomes] = useState<{ 'event_key': string; 'matches': TBAMatchOutcome[] }[] | null>(null);

    useEffect(() => {
        fetchData();
    }, [navigate]);

    function fetchData() {
        // Get member data from session storage
        const storedMember = sessionStorage.getItem('currentMember');

        if (!storedMember) {
            // No member data, redirect to landing
            navigate('/');
            return;
        }

        const memberInfo = JSON.parse(storedMember);
        const memberId = memberInfo.id;

        const fetchMemberData = async () => {
            try {
                setLoading(true);

                // Fetch member info and stats
                const { data: member } = await supabase
                    .from('members')
                    .select('*')
                    .eq('id', memberId)
                    .single();

                // Fetch time entries
                const { data: times } = await supabase
                    .from('time_entries')
                    .select('*')
                    .eq('member_id', memberId)
                    .order('created_at', { ascending: false });

                let tempTotal: number = 0;
                let weekLogs: WeekHourLog[] = [];

                let weekLogBuilder = {

                }
                times?.forEach((time) => {
                    tempTotal += time.total_hours;

                    let currentWeek = getWeeksSince(new Date('2025-09-10'), time.session_date);

                    if (!weekLogBuilder[String(currentWeek)]) {
                        weekLogBuilder[String(currentWeek)] = time.total_hours;
                    } else {
                        weekLogBuilder[String(currentWeek)] += time.total_hours;
                    }
                });

                Object.keys(weekLogBuilder).map((value) => {
                    weekLogs.push({ 'hours': weekLogBuilder[value], 'week': `Week ${value}` })
                });

                setWeekHours(weekLogs);

                setTotalHours(Math.round(tempTotal * 100) / 100);


                // Fetch time entries
                const { data: matchesScouted } = await supabase
                    .from('matches_predictions')
                    .select('*')
                    .eq('member_id', memberId)
                    .order('team_number', { ascending: false });

                let matchesScoutedCounter: number = matchesScouted?.length ?? 0;
                let mostScoutedTeam = matchesScouted[0].team_number ?? 0;
                let totalPointsCounter: number = 0;
                let eventKeys: string[] = [];
                matchesScouted?.forEach((value) => {
                    totalPointsCounter += value.total_points;
                    !eventKeys.includes(value.event_key) ? eventKeys.push(value.event_key) : '';
                });

                setMostScoutedTeam(mostScoutedTeam);
                setTotalMatchesScouted(matchesScoutedCounter);
                setTotalPointsScouted(totalPointsCounter);

                setMemberData({ ...member, id: memberId });
                setTimeEntries(times || []);
                setMatchEntries(matchesScouted || []);
                setIsClockedIn(member['clocked_in']);

                setTBAOutcomes(await fetchTBAMatchesGrouped(eventKeys));

            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMemberData();
    }

    useEffect(() => {

        if (matchEntries && tbaOutcomes) {

            let correct = 0;
            let wrong = 0;
            let balance = 0;

            matchEntries.forEach((match) => {
                let data = tbaOutcomes.find(item => item.event_key == match.event_key);
                let matchObject = data?.matches?.find(item => item.match_number == match.match_number);

                if (matchObject) {
                    let isCorrect = matchObject.winning_alliance == match.prediction;

                    isCorrect ? correct++ : wrong++;

                    isCorrect ? balance += match.wager : balance -= match.wager;
                }
            });

            setPredictionStats({ 'balance': balance, 'correct': correct, 'incorrect': wrong })
        }

    }, [tbaOutcomes, matchEntries])

    const handleLogout = () => {
        sessionStorage.removeItem('currentMember');
        navigate('/');
    };

    const fetchTBAMatchesGrouped = async (eventKeys: string[]): Promise<{ 'event_key': string; 'matches': TBAMatchOutcome[] }[]> => {
        try {
            const matchPromises = eventKeys.map(async (key) => {
                const response = await fetch(`https://www.thebluealliance.com/api/v3/event/${key}/matches/simple`, {
                    headers: {
                        'X-TBA-Auth-Key': TBA_API_KEY
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch matches for ${key}: ${response.status}`);
                }

                const matches = await response.json();
                const filtered = matches.filter((item) => { return item['comp_level'] == 'qm' });
                return { 'event_key': key, 'matches': filtered };
            });

            const results = await Promise.all(matchPromises);
            return results;
        } catch (error) {
            console.error('Error fetching TBA matches:', error);
            throw error;
        }
    }

    const setClockStatus = async (status: boolean) => {


        try {
            const { data, error } = await supabase
                .from('members')
                .update({
                    clocked_in: status
                })
                .eq('id', memberData.id);


            if (error) throw error;

        } catch (err) {
            console.error('Error setting clock status:', err);
        }
    }

    const handleClockIn = async () => {

        if (!confirm('Are you sure you wish to clock IN?'))
            return;

        try {
            const { data, error } = await supabase
                .from('time_entries')
                .insert({
                    member_id: memberData.id,
                    clock_in_time: new Date().toISOString(),
                });

            await setClockStatus(true);

            if (error) throw error;

            setIsClockedIn(true);

            fetchData();

        } catch (err) {
            console.error('Error clocking in:', err);
        }
    };

    const handleClockOut = async () => {

        if (!confirm('Are you sure you wish to clock OUT?'))
            return;

        try {
            const { data, error } = await supabase
                .from('time_entries')
                .update({
                    clock_out_time: new Date().toISOString()
                })
                .eq('member_id', memberData.id)
                .is('clock_out_time', null);

            await setClockStatus(false);

            if (error) throw error;

            setIsClockedIn(false);

            fetchData();
            
        } catch (err) {
            console.error('Error clocking out:', err);
        }
    };

    // Rest of your component JSX stays the same, just change the logout button:
    return (
        <div className="min-h-screen bg-gray-900 text-white px-0 pt-8 pb-20 flex flex-col items-center">
            {/* Header */}
            <div className="flex bg-black/85 border-black/25 mx-8 gap-10 border-1 shadow-lg px-5 py-3 rounded-lg justify-between items-center mb-8 shadow-orange-900/25 ">
                <div>
                    <h1 className="font-nippori text-4xl font-bold text-white">
                        Welcome, {memberData?.first_name}!
                    </h1>
                </div>
                <button
                    onClick={handleLogout}
                    className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg transition-colors"
                >
                    Logout
                </button>
            </div>

            {loading && (
                <div className='fixed inset-0 z-50 bg-black/90 flex flex-col justify-center items-center'>
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mb-4"></div>
                    <h2 className='text-3xl text-white font-bold'>Loading Dashboard...</h2>
                </div>
            )}

            {!isClockedIn ?
                <div className="flex w-full items-center flex-col mt-10 gap-5">
                    <h3 className="text-lg">You are currently <span className="font-bold text-red-400 text-shadow-red-700/25 text-shadow-md animate-pulse">CLOCKED OUT</span>.</h3>
                    <button onClick={handleClockIn} className="cursor-pointer gap-10 flex flex-row items-center justify-around font-bold color-gray-900 text-4xl bg-gradient-to-r from-green-700/25 to-green-400/25 px-15 py-10 rounded-xl border-green-300/100 border-1 shadow-xl shadow-green-900/40">
                        <h1>Clock In</h1>
                        <AlarmClockPlus color="white" size={50} />
                    </button>
                </div>
                : <div className="flex w-full items-center flex-col mt-10 gap-5">
                    <h3 className="text-lg">You are currently <span className="font-bold text-green-400 text-shadow-green-700/25 text-shadow-md animate-pulse">CLOCKED IN</span>.</h3>
                    <button onClick={handleClockOut} className="cursor-pointer gap-10 flex flex-row items-center justify-around font-bold color-gray-900 text-4xl bg-gradient-to-r from-red-700/25 to-red-400/25 px-15 py-10 rounded-xl border-red-300/100 border-1 shadow-xl shadow-red-900/40">
                        <h1>Clock Out</h1>
                        <AlarmClockMinus color="white" size={50} />
                    </button>
                </div>
            }

            <div className="w-full max-w-3xl mt-10 rounded-lg border-1 border-gray-500/50 bg-gradient-to-br from-gray-800 to-gray-900 mx-8 py-5 flex flex-col items-center justify-around gap-3">
                <div className="flex flex-row gap-3 items-center">
                    <Hourglass color="white" size={24} />
                    <h1 className=" text-2xl text-center">Total hours (all time):</h1>
                </div>
                <h1 className="text-4xl font-bold">{totalHours}</h1>
            </div>

            <div className="mt-10 w-full px-1">
                <ResponsiveContainer width={'100%'} height={250}>
                    <BarChart data={weekHours}>
                        <XAxis dataKey="week" />
                        <YAxis type="number" width={30} domain={[0, dataMax => (Math.max(dataMax * 2, 6))]} />
                        <Bar dataKey="hours" fill="#df8e16ff" />
                        <Label position={'insideTop'} fill="white">Hours per week</Label>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="w-full max-w-3xl flex flex-row items-center justify-center mt-3">
                <Coins size={58} className="flex-2" />
                <div className="flex-5 border-l-3 border-l-gray-500/50">
                    <h1 className="mt-3 text-2xl text-center text-gray-400">Prediction balance</h1>
                    <h1 className="mt-3 text-5xl font-bold text-center">{`$${predictionStats?.balance ?? 0}`}</h1>
                </div>
            </div>

            <div className="w-full max-w-3xl flex flex-row items-center justify-center mt-10">
                <Tally5 size={58} className="flex-2" />
                <div className=" flex-5 border-l-3 border-l-gray-500/50">
                    <h1 className="mt-3 text-2xl text-center text-gray-400">Total matches scouted</h1>
                    <h1 className="mt-3 text-5xl font-bold text-center">{totalMatchesScouted}</h1>
                </div>
            </div>

            <div className="w-full max-w-3xl flex flex-row items-center justify-center mt-10">
                <Crosshair size={58} className="flex-2" />
                <div className=" flex-5 border-l-3 border-l-gray-500/50">
                    <h1 className="mt-3 text-2xl text-center text-gray-400">Prediction accuracy</h1>
                    <h1 className="mt-3 text-5xl font-bold text-center">{`${Math.round(((predictionStats?.correct ?? 0) / ((predictionStats?.correct ?? 0) + (predictionStats?.incorrect ?? 0))) * 1000) / 10}%`}</h1>
                </div>
            </div>

            {/* Additional Stats - Dark Theme 2x2 Grid */}
            <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto mt-10 px-2">
                {/* Total Points Scouted */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl p-4 border border-gray-700 hover:border-orange-500 transition-all duration-300 transform hover:scale-105">
                    <div className="flex items-center justify-between mb-4 gap-3">
                        <div className="bg-orange-500/20 p-3 rounded-full">
                            <svg className="w-8 h-8 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                        </div>
                        <div className="text-right">
                            <p className="text-orange-400 text-sm font-medium uppercase tracking-wide">Total Points</p>
                            <p className="text-white text-3xl font-bold">{totalPointsScouted}</p>
                        </div>
                    </div>
                    <div className="border-t border-gray-700 pt-4">
                        <p className="text-gray-400 text-sm">Total Points Scouted Across Matches</p>
                    </div>
                </div>

                {/* Most Scouted Team */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl p-4 border border-gray-700 hover:border-orange-500 transition-all duration-300 transform hover:scale-105">
                    <div className="flex items-center justify-between mb-4 gap-3">
                        <div className="bg-orange-500/20 p-3 rounded-full">
                            <svg className="w-8 h-8 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                                <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                            </svg>
                        </div>
                        <div className="text-right">
                            <p className="text-orange-400 text-sm font-medium uppercase tracking-wide">Top Team</p>
                            <p className="text-white text-3xl font-bold">{mostScoutedTeam}</p>
                        </div>
                    </div>
                    <div className="border-t border-gray-700 pt-4">
                        <p className="text-gray-400 text-sm">Most Scouted Team Across Matches</p>
                    </div>
                </div>

                {/* Correct Predictions */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl p-4 border border-gray-700 hover:border-green-500 transition-all duration-300 transform hover:scale-105">
                    <div className="flex items-center justify-between mb-4 gap-3">
                        <div className="bg-green-500/20 p-3 rounded-full">
                            <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="text-right">
                            <p className="text-green-400 text-sm font-medium uppercase tracking-wide">Correct</p>
                            <p className="text-white text-3xl font-bold">{predictionStats?.correct ?? 0}</p>
                        </div>
                    </div>
                    <div className="border-t border-gray-700 pt-4">
                        <p className="text-gray-400 text-sm">Predictions Made Correctly</p>
                    </div>
                </div>

                {/* Incorrect Predictions */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl p-4 border border-gray-700 hover:border-red-500 transition-all duration-300 transform hover:scale-105">
                    <div className="flex items-center justify-between mb-4 gap-3">
                        <div className="bg-red-500/20 p-3 rounded-full">
                            <svg className="w-8 h-8 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="text-right">
                            <p className="text-red-400 text-sm font-medium uppercase tracking-wide">Incorrect</p>
                            <p className="text-white text-3xl font-bold">{predictionStats?.incorrect ?? 0}</p>
                        </div>
                    </div>
                    <div className="border-t border-gray-700 pt-4">
                        <p className="text-gray-400 text-sm">Predictions Made Incorrectly</p>
                    </div>
                </div>

            </div>
        </div >
    );
}