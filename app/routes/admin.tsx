import type { Database } from "database.types";
import { ChartBar, Check, Clock, Download, Eraser, Home, Minimize, RefreshCcw, TrendingUp, UserRound, UserRoundMinus, UserRoundPen, UserRoundPlus, X } from "lucide-react";
import Html5QrcodePlugin from "public/html5QrcodePlugin";
import { ADMIN_PASSWORD, supabase } from "public/supabase";
import type { WeekHourLog } from "public/types";
import { getWeeksSince } from "public/util";
import { useEffect, useRef, useState } from "react";
import html2canvas from 'html2canvas-pro';
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Line, LineChart } from "recharts";
import JsBarcode from "jsbarcode";

type MemberType = Database["public"]["Tables"]["members"]["Row"];
type EntriesType = Database["public"]["Tables"]["time_entries"]["Row"];
type MatchType = Database["public"]["Tables"]["matches_predictions"]["Row"];

type TotalStatistics = {
    'first_name': string;
    'last_initial': string;
    'id': string;
    'totalHours': number;
    'last7': number;
    'totalMatches': number;
}

type CreateMemberType = {
    'clocked_in': boolean;
    'first_name': string;
    'last_initial': string;
}

export default function Admin() {

    const [members, setMembers] = useState<MemberType[]>([]);
    const [timeEntries, setTimeEntries] = useState<EntriesType[]>([]);
    const [matchEntries, setMatchEntries] = useState<MatchType[]>([]);
    const [loading, setLoading] = useState(true);

    const [selected, setSelected] = useState<string[]>([]);

    const [currentPassword, setCurrentPassword] = useState<string>('');
    const [authenticated, setAuthenticated] = useState<boolean>(false);

    const [active, setActive] = useState<MemberType | null>(null);

    const [sortStatistic, setSortStatistic] = useState<'totalHours' | 'last7' | 'totalMatches'>('totalHours');

    const [showAddMember, setShowAddMember] = useState<boolean>(false);
    const [showEditMember, setShowEditMember] = useState<boolean>(false);
    const [currentlyCreatingMember, setCurrentlyCreatingMember] = useState<CreateMemberType | null>(null);
    const [currentlyEditingMember, setCurrentlyEditingMember] = useState<MemberType | null>(null);

    const [renderingMemberCard, setRenderingMemberCard] = useState<MemberType | null>(null);

    async function fetchData() {
        setLoading(true);
        const { data: items } = await supabase.from('members').select();

        if (items) {
            setMembers(items);
        }

        //setRenderingMemberCard(items[0]);

        const { data: times } = await supabase
            .from('time_entries')
            .select('*')
            .order('created_at', { ascending: false });

        setTimeEntries(times ?? []);

        const { data: matches } = await supabase
            .from('matches_predictions')
            .select('*')
            .order('team_number', { ascending: false });

        setMatchEntries(matches ?? []);

        setLoading(false);

        setSelected([]);
        setActive(null);
    }

    useEffect(() => {

        fetchData();

    }, []);

    const submitPassword = () => {
        setAuthenticated(currentPassword == ADMIN_PASSWORD);
    }

    const calculateTotalStatistics = (): TotalStatistics[] => {
        let temp: TotalStatistics[] = [];

        members.forEach((member) => {
            temp.push({
                'id': member.id,
                'totalHours': calculateTotalHours(member),
                'last7': calculateLast7DaysHours(member),
                'totalMatches': calculateMatchesScouted(member),
                'first_name': member.first_name,
                'last_initial': member.last_initial,
            })
        });

        return temp;
    }

    const toggleMember = (member: MemberType) => {
        if (selected.includes(member.id)) {
            setSelected(prev => prev.filter((item) => item !== member.id));
        } else {
            setSelected(prev => [...prev, member.id]);
        }
    }

    const selectActive = (member: MemberType) => {
        active?.id == member.id ? setActive(null) : setActive(member);
    }

    const calculateTotalHours = (member: MemberType): number => {

        let curretMemberEntries = timeEntries.filter((item) => item.member_id == member.id);

        return curretMemberEntries.reduce((sum, item) => sum + (item.total_hours ?? 0), 0);
    }

    const getWeekHourLog = (member: MemberType): WeekHourLog[] => {
        let times = timeEntries.filter((item) => item.member_id == member.id);

        let tempTotal: number = 0;
        let weekLogs: WeekHourLog[] = [];

        let weekLogBuilder: any = {};

        times?.forEach((time) => {

            if (time.total_hours && time.session_date) {
                tempTotal += time.total_hours;

                let currentWeek = getWeeksSince(new Date('2025-10-19'), new Date(time.session_date));

                if (!weekLogBuilder[String(currentWeek)]) {
                    weekLogBuilder[String(currentWeek)] = time.total_hours;
                } else {
                    weekLogBuilder[String(currentWeek)] += time.total_hours;
                }

            }
        });

        Object.keys(weekLogBuilder).map((value) => {
            weekLogs.push({ 'hours': Math.round(weekLogBuilder[value] * 10) / 10, 'week': `Week ${value}` })
        });

        return weekLogs;
    }

    const calculateLast7DaysHours = (member: MemberType): number => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        let currentMemberEntries = timeEntries.filter((item) => {
            // Filter by member ID
            const isMember = item.member_id == member.id;

            // Filter by last 7 days
            const entryDate = new Date(item.created_at ?? new Date("July 20, 1969 00:20:18 GMT"));
            const isWithinLast7Days = entryDate >= sevenDaysAgo;

            return isMember && isWithinLast7Days;
        });

        return currentMemberEntries.reduce((sum, item) => sum + (item.total_hours ?? 0), 0);
    }

    const getLast7DaysLogs = (member: MemberType): EntriesType[] => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        let currentMemberEntries = timeEntries.filter((item) => {
            // Filter by member ID
            const isMember = item.member_id == member.id;

            // Filter by last 7 days
            const entryDate = new Date(item.created_at ?? new Date("July 20, 1969 00:20:18 GMT"));
            const isWithinLast7Days = entryDate >= sevenDaysAgo;

            return isMember && isWithinLast7Days;
        });

        return currentMemberEntries;
    }

    const calculateMatchesScouted = (member: MemberType): number => {

        let matchesScoutedByMember = matchEntries.filter((item) => item.member_id == member.id);

        return matchesScoutedByMember.length;

    }

    const generateBlankNewMember = () => {
        setCurrentlyCreatingMember({
            first_name: 'John',
            last_initial: 'D',
            clocked_in: false,
        });

        setShowAddMember(true);
    }

    const startEditingMember = (member: MemberType) => {
        setCurrentlyEditingMember({
            first_name: member.first_name,
            last_initial: member.last_initial,
            clocked_in: member.clocked_in,
            id: member.id,
            created_at: member.created_at
        });

        setShowEditMember(true);
    }

    const uploadNewMember = async (member: CreateMemberType | null) => {
        if (!member)
            return;

        setLoading(true);

        try {
            const { error } = await supabase
                .from('members')
                .insert(member)
        } catch (error) {
            alert(error);
        }

        setShowAddMember(false);
        setLoading(false);

        fetchData();
    }

    const updateMember = async (member: MemberType | null) => {
        if (!member)
            return;

        setLoading(true);

        try {
            const { error } = await supabase
                .from('members')
                .update(member)
                .eq('id', member.id)
        } catch (error) {
            alert(error);
        }

        setShowEditMember(false);
        setLoading(false);

        fetchData();
    }

    const deleteSelected = async () => {

        if (!confirm('Are you sure you want to delete all selected members? This will remove all aspects of them from the database. You can readd them later but all past records will be permenantly deleted.')) {
            return;
        }

        setLoading(true);
        selected.forEach(async (item) => {
            const memberDelete = await supabase
                .from('members')
                .delete()
                .eq('id', item)

            const timeDelete = await supabase
                .from('time_entries')
                .delete()
                .eq('member_id', item)

            const matchDelete = await supabase
                .from('matches_predictions')
                .delete()
                .eq('member_id', item)
        });

        alert('Deleted member, may take a few seconds to update. Refresh in top right corner to confirm deletion.');

        setLoading(false);
        fetchData();
    }

    const cardRef = useRef(null);
    const downloadSelectedCards = async () => {
        selected.forEach(async (item) => {

            const member = members.find((f) => f.id == item);

            setRenderingMemberCard(member);

            const card = cardRef.current;
            if (!card) return;

            // temporarily show
            card.style.display = "block";

            const canvas = await html2canvas(card, {});
            const link = document.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = `${member?.first_name}.png`;
            link.click();

            // hide again
            card.style.display = "none";

        });
    };

    const wipeSelected = async () => {

        if (!confirm('Are you sure you want to wipe all data of selected members? This will keep the members in the database but reset all their statistics and numbers to 0. Cannot be undone.')) {
            return;
        }

        setLoading(true);
        selected.forEach(async (item) => {
            const memberDelete = await supabase
                .from('members')
                .update({ clocked_in: false })
                .eq('id', item)

            const timeDelete = await supabase
                .from('time_entries')
                .delete()
                .eq('member_id', item)

            const matchDelete = await supabase
                .from('matches_predictions')
                .delete()
                .eq('member_id', item)
        });

        alert('Reset member data, may take a few seconds to update. Refresh in top right corner to confirm wiped data.');

        setLoading(false);
        fetchData();
    }

    return (
        <div className="relative h-[100dvh] text-white max-h-screen">
            <img
                className="h-[100dvh] brightness-25 w-full object-cover fixed top-0 inset-0 z-1 select-none"
                src="./admin.jpg"
                alt="Admin background"
            />

            {loading && (
                <div className='fixed inset-0 z-50 bg-black/90 flex flex-col justify-center items-center'>
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mb-4"></div>
                    <h2 className='text-3xl text-white font-bold'>Loading Dashboard...</h2>
                </div>
            )}

            {true && (
                <div className='fixed md:hidden inset-0 z-50 bg-black/90 flex flex-col justify-center items-center gap-5'>
                    <h2 className='text-2xl text-white font-bold mx-5'>This page requires a larger screen to visit. Try using a laptop.</h2>
                    <a href="/" className="text-orange-400">Return Home</a>
                </div>
            )}

            {showAddMember && (
                <div className='fixed inset-0 z-50 bg-black/67 flex flex-col justify-center items-center'>
                    <div className="bg-black/50 p-10 gap-4 backdrop-blur-xs rounded-lg p-0 border-1 flex flex-col border-gray-600">

                        <h1 className="text-3xl font-semibold select-none">Add New Member</h1>

                        <div>
                            <h2 className="text-white font-md font-light">First name: </h2>
                            <input placeholder="John" onChange={(e) => {
                                setCurrentlyCreatingMember(prev => ({
                                    first_name: e.target.value,
                                    clocked_in: prev?.clocked_in ?? false,
                                    last_initial: prev?.last_initial ?? 'D',
                                }));
                            }} className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 backdrop-blur-sm focus:outline-none cursor-text focus:ring-2 focus:ring-white/75 focus:border-transparent transition-all duration-300" type="text"></input>
                        </div>

                        <div>
                            <h2 className="text-white font-md font-light">Last initial: </h2>
                            <input placeholder="D" onChange={(e) => {
                                setCurrentlyCreatingMember(prev => ({
                                    first_name: prev?.first_name ?? 'John',
                                    clocked_in: prev?.clocked_in ?? false,
                                    last_initial: e.target.value,
                                }));
                            }} className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 backdrop-blur-sm focus:outline-none cursor-text focus:ring-2 focus:ring-white/75 focus:border-transparent transition-all duration-300" type="text"></input>
                        </div>

                        <div className="flex flex-row flex-1 gap-2 justify-between">
                            <button onClick={() => uploadNewMember(currentlyCreatingMember)} className="flex-1 w-full bg-gradient-to-r from-orange-900 to-orange-500 cursor-pointer hover:brightness-75 hover:contrast-120 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-white/75">
                                Create
                            </button>
                            <button onClick={() => setShowAddMember(false)} className=" bg-red-700 cursor-pointer hover:brightness-75 hover:contrast-120 text-white font-semibold py-3 px-3 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-white/75">
                                <X />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showEditMember && (
                <div className='fixed inset-0 z-50 bg-black/67 flex flex-col justify-center items-center'>
                    <div className="bg-black/50 p-10 gap-4 backdrop-blur-xs rounded-lg p-0 border-1 flex flex-col border-gray-600">

                        <h1 className="text-3xl font-semibold select-none">Edit Existing Member</h1>

                        <div>
                            <h2 className="text-white font-md font-light">First name: </h2>
                            <input placeholder={currentlyEditingMember?.first_name} onChange={(e) => {
                                setCurrentlyEditingMember(prev => ({
                                    first_name: e.target.value,
                                    clocked_in: prev?.clocked_in ?? false,
                                    last_initial: prev?.last_initial ?? 'D',
                                    id: prev?.id ?? '',
                                    created_at: prev?.created_at ?? String(new Date())
                                }));
                            }} className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 backdrop-blur-sm focus:outline-none cursor-text focus:ring-2 focus:ring-white/75 focus:border-transparent transition-all duration-300" type="text"></input>
                        </div>

                        <div>
                            <h2 className="text-white font-md font-light">Last initial: </h2>
                            <input placeholder={currentlyEditingMember?.last_initial} onChange={(e) => {
                                setCurrentlyEditingMember(prev => ({
                                    first_name: prev?.first_name ?? 'John',
                                    clocked_in: prev?.clocked_in ?? false,
                                    last_initial: e.target.value,
                                    id: prev?.id ?? '',
                                    created_at: prev?.created_at ?? String(new Date())
                                }));
                            }} className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 backdrop-blur-sm focus:outline-none cursor-text focus:ring-2 focus:ring-white/75 focus:border-transparent transition-all duration-300" type="text"></input>
                        </div>

                        <div className="flex flex-row flex-1 gap-2 justify-between">
                            <button onClick={() => updateMember(currentlyEditingMember)} className="flex-1 w-full bg-gradient-to-r from-orange-900 to-orange-500 cursor-pointer hover:brightness-75 hover:contrast-120 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-white/75">
                                Save Edit
                            </button>
                            <button onClick={() => setShowEditMember(false)} className=" bg-red-700 cursor-pointer hover:brightness-75 hover:contrast-120 text-white font-semibold py-3 px-3 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-white/75">
                                <X />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="relative z-10 h-screen flex flex-col max-h-screen gap-10">

                <div className="bg-black/67 py-3 flex flex-row justify-between items-center px-8 select-none">
                    <h1 className="font-bold text-4xl transform hover:translate-x-5 transition duration-350">Admin Dashboard</h1>
                    <div className="flex flex-row items-center gap-8">
                        <RefreshCcw onClick={fetchData} className="transition cursor-pointer hover:scale-120" size={32} />
                        <Home onClick={() => window.open('/', '_self')} className="transition cursor-pointer hover:scale-120" size={32} />
                    </div>
                </div>


                {!authenticated ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl max-w-md w-full flex flex-col items-center gap-5">
                            <h1 className="text-3xl font-semibold select-none">Enter Admin Password:</h1>
                            <input type="password" onChange={(e) => { setCurrentPassword(e.target.value) }} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 backdrop-blur-sm focus:outline-none cursor-text focus:ring-2 focus:ring-white/75 focus:border-transparent transition-all duration-300"></input>
                            <button onClick={submitPassword} className="w-full bg-gradient-to-r from-orange-900 to-orange-500 cursor-pointer hover:brightness-75 hover:contrast-120 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-white/75">
                                Submit
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-[1fr_3fr] pb-4 px-4 gap-5 overflow-hidden h-full max-h-screen">
                        <div className="flex flex-col w-full h-full overflow-y-auto">
                            <div className="flex flex-1 flex-col items-center bg-black/10 gap-2 py-1 overflow-y-scroll h-full border-1 px-1 backdrop-blur-sm rounded-t-lg p-0 border-gray-800 shadow-2xl">
                                {members.sort((a, b) => a.first_name.localeCompare(b.first_name)).map((item) => {
                                    return (
                                        <button onClick={() => selectActive(item)} className={`min-h-3xl flex rounded-sm items-center border border-white/20 gap-4 w-full px-2 py-2 shadow-2xl cursor-pointer hover:border-orange-500/75 transition ${active?.id == item.id ? 'bg-orange-500/50 hover:bg-orange-800/50' : 'bg-black/90 hover:bg-black'}`}>
                                            <button onClick={() => toggleMember(item)} className="flex items-center justify-center cursor-pointer h-8 rounded-md w-8 border-1 border-gray-200/25 hover:border-gray-300/85 bg-black/67">
                                                {selected.includes(item.id) &&
                                                    <Check color="lightgreen" />
                                                }
                                            </button>
                                            <h1 className="font-regular text-xl">{item.first_name} {item.last_initial}</h1>
                                        </button>
                                    )
                                })}
                            </div>
                            <div className="relative w-full flex flex-row bg-black/90 rounded-b-lg fixed bottom-0 left-0 self-end border border-white/20 w-full px-3 py-1 shadow-2xl justify-between">
                                <button onClick={generateBlankNewMember} className="cursor-pointer border-green-400/10 hover:border-green-400/50 border-2 p-1 rounded-sm">
                                    <UserRoundPlus size={28} />
                                </button>
                                {selected.length > 0 &&
                                    <button onClick={downloadSelectedCards} className="cursor-pointer flex flex-row items-center gap-2 border-purple-400/10 hover:border-purple-400/50 border-2 p-1 rounded-sm">
                                        <Download size={28} />
                                    </button>
                                }
                                {selected.length > 0 &&
                                    <button onClick={wipeSelected} className="cursor-pointer flex flex-row items-center gap-2 border-yellow-400/10 hover:border-yellow-400/50 border-2 p-1 rounded-sm">
                                        <h2>Wipe</h2>
                                        <Eraser size={28} />
                                    </button>
                                }
                                {selected.length > 0 &&
                                    <button onClick={deleteSelected} className="cursor-pointer flex flex-row items-center gap-2 border-red-400/10 hover:border-red-400/50 border-2 p-1 rounded-sm">
                                        <h2>Delete</h2>
                                        <UserRoundMinus size={28} />
                                    </button>
                                }
                            </div>
                        </div>
                        <div className="flex flex-col items-center justify-center overflow-y-auto">
                            {active ? (
                                <div className="min-w-md bg-black/10 w-full h-full backdrop-blur-xs rounded-lg p-0 border-1 flex flex-col border-gray-800 shadow-2xl">
                                    <div className="overflow-y-auto flex flex-col px-5 py-5 gap-5 h-full">
                                        <div className="flex flex-row gap-5 w-full items-center justify-between">
                                            <button className="cursor-pointer hover:scale-110" onClick={() => startEditingMember(active)}>
                                                <UserRoundPen />
                                            </button>
                                            <h1 className=" text-3xl">Viewing <span className="font-semibold">{active ? active.first_name : 'John'} {active ? active.last_initial : 'D'}</span></h1>
                                            <button className="cursor-pointer hover:scale-110" onClick={() => setActive(null)}>
                                                <Minimize />
                                            </button>
                                        </div>

                                        <a className="self-center underline text-gray-300" href={`https://qrcode.tec-it.com/API/QRCode?data=${active?.id}&backcolor=%23ffffff&quietzone=2&method=download`}>Download QR Code</a>

                                        <div className="bg-gray-900/50 rounded-lg p-4 w-xl self-center border border-gray-700">
                                            <div className="flex items-center gap-3 mb-2">
                                                <ChartBar className="text-orange-500" size={24} />
                                                <h2 className="text-xl font-semibold">Statistics</h2>
                                            </div>
                                            <div className="flex gap-10">
                                                <div>
                                                    <div className="text-3xl font-bold text-orange-500">{active ? Math.round(calculateTotalHours(active) * 10) / 10 : 0}hr</div>
                                                    <p className="text-gray-400 text-sm">Season total</p>
                                                </div>
                                                <div>
                                                    <div className="text-3xl font-bold text-orange-500">{active ? Math.round(calculateLast7DaysHours(active) * 10) / 10 : 0}h</div>
                                                    <p className="text-gray-400 text-sm">Last 7 days</p>
                                                </div>
                                                <div>
                                                    <div className="text-3xl font-bold text-orange-500">{active ? Math.round(calculateMatchesScouted(active)) : 0} matches</div>
                                                    <p className="text-gray-400 text-sm">Scouted, all time</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                                            <div className="flex items-center gap-3 mb-4">
                                                <TrendingUp className="text-orange-500" size={24} />
                                                <h2 className="text-xl font-semibold">Performance</h2>
                                            </div>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={active ? getWeekHourLog(active) : []}>
                                                        <XAxis
                                                            dataKey="week"
                                                            stroke="#9CA3AF"
                                                            fontSize={12}
                                                        />
                                                        <YAxis
                                                            stroke="#9CA3AF"
                                                            fontSize={12}
                                                        />
                                                        <Tooltip
                                                            contentStyle={{
                                                                backgroundColor: '#1F2937',
                                                                border: '1px solid #374151',
                                                                borderRadius: '6px',
                                                                color: '#F3F4F6'
                                                            }}
                                                            isAnimationActive={false}
                                                            labelStyle={{ color: '#F97316' }}
                                                        />
                                                        <Line
                                                            type="monotone"
                                                            dataKey="hours"
                                                            stroke="#F97316"
                                                            strokeWidth={3}
                                                            dot={{ fill: '#F97316', strokeWidth: 2, r: 4 }}
                                                            activeDot={{ r: 6, fill: '#F97316' }}
                                                        />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                                            <div className="flex items-center gap-3 mb-4">
                                                <Clock className="text-orange-500" size={24} />
                                                <h2 className="text-xl font-semibold">Last 7 Days Activity</h2>
                                            </div>
                                            <div className=" max-h-80 overflow-y-auto">
                                                {
                                                    active ?
                                                        getLast7DaysLogs(active).length > 0 ?
                                                            getLast7DaysLogs(active).map((item, index) => {
                                                                return (
                                                                    <div key={index} className="flex justify-between items-center p-3 bg-black/30 rounded-md mb-2 last:mb-0">
                                                                        <div>
                                                                            <p className="font-medium text-white">{item.session_date}</p>
                                                                            <p className="text-sm text-gray-400">Session logged</p>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="text-orange-500 font-semibold">{item.total_hours}h</p>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })
                                                            : <p className="text-gray-400 text-center py-4">No activity in the last 7 days</p>
                                                        : <p className="text-gray-400 text-center py-4">Select a member to view activity</p>
                                                }
                                            </div>
                                        </div>


                                    </div>
                                </div>
                            ) : (
                                <div className="h-full">
                                    <h1 className="text-lg mb-5">No member selected, showing leaderboard. Select member on left to view individual statistics.</h1>

                                    {members &&

                                        <div className="min-w-md bg-black/10 w-full h-auto backdrop-blur-xs rounded-lg border-1 flex flex-col border-gray-800 shadow-2xl">


                                            <div className="flex-1">
                                                {/* Table Header */}
                                                <div className="grid grid-cols-[auto_2fr_1fr_1fr_1fr] gap-4 px-5 bg-gray-800/92 sticky top-0 border-b border-gray-700">
                                                    <div></div>
                                                    <h3 className="text-sm font-semibold text-gray-300 py-3">Member</h3>
                                                    <h3 className="text-sm font-semibold text-gray-300 text-center cursor-pointer hover:bg-black/50 py-3" onClick={() => setSortStatistic('totalHours')}>Total Hours</h3>
                                                    <h3 className="text-sm font-semibold text-gray-300 text-center cursor-pointer hover:bg-black/50 py-3" onClick={() => setSortStatistic('last7')}>Last 7 Days</h3>
                                                    <h3 className="text-sm font-semibold text-gray-300 text-center cursor-pointer hover:bg-black/50 py-3" onClick={() => setSortStatistic('totalMatches')}>Matches</h3>
                                                </div>

                                                {/* Table Rows */}
                                                {calculateTotalStatistics().sort((a, b) => {
                                                    // For descending order (highest first)
                                                    return b[sortStatistic] - a[sortStatistic];
                                                    // For ascending order (lowest first), use:
                                                }).map((data, index) => (
                                                    <div key={index} className="grid grid-cols-[auto_2fr_1fr_1fr_1fr] gap-4 px-5 py-4 border-b border-gray-800/30 hover:bg-black/20 transition-colors">
                                                        <UserRound className="text-orange-500" size={20} />
                                                        <div className="text-white font-medium cursor-pointer hover:text-orange-500" onClick={() => setActive(members.find((item) => item.id == data.id) ?? null)}>
                                                            {data.first_name} {data.last_initial}
                                                        </div>
                                                        <div className="text-orange-500 font-semibold text-center">
                                                            {Math.round(data.totalHours * 10) / 10}h
                                                        </div>
                                                        <div className="text-orange-500 font-semibold text-center">
                                                            {Math.round(data.last7 * 10) / 10}h
                                                        </div>
                                                        <div className="text-orange-500 font-semibold text-center">
                                                            {data.totalMatches}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    }



                                </div>
                            )
                            }
                        </div>
                    </div>
                )}

            </div>

            {renderingMemberCard &&
                <div className="h-full z-100000 absolute">
                    <div
                        ref={cardRef}
                        id="contentToCapture"
                        className="absolute flex bg-white w-[337px] h-[212px] flex-col overflow-hidden text-black p-0"
                    >
                            <div className="text-[40px] ml-2 font-[Brand]">HexHounds</div>
                        <div className="flex flex-row items-center justify-between gap-4 pl-2 pr-5 w-full">
                        <div className="font-semibold text-[30px] text-right ">25-26</div>
                        <div className="font-semibold text-[30px] text-right">{renderingMemberCard.first_name} {renderingMemberCard.last_initial}</div>
                        </div>
                        <div className="absolute left-0 bottom-0 justify-center w-[160px]">
                            <Barcode value={renderingMemberCard?.id_barcode} />
                        </div>
                        <div className="absolute right-2 bottom-1 flex justify-center">
                            <img
                                src={`/logo.png`}
                                alt="Logo"
                                className="w-[130px] object-contain"
                            />
                        </div>
                    </div>
                </div>
            }
        </div >
    );
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function Barcode({ value }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && value) {
      JsBarcode(ref.current, value, { format: "CODE128", displayValue: false, height: 80 });
    }
  }, [value]);
  return <svg ref={ref} />;
}