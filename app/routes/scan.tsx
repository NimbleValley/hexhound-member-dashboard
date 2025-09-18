import { Home, RefreshCcw } from "lucide-react";
import Html5QrcodePlugin from "public/html5QrcodePlugin";
import { supabase } from "public/supabase";
import { useEffect, useState } from "react";

export default function Scan() {

    const [currentMember, setCurrentMember] = useState<any>();
    const [members, setMembers] = useState<any[]>([]);

    const [selectedID, setSelectedID] = useState<string>();

    const [loading, setLoading] = useState(true);

    async function fetchData() {
        setLoading(true);
        const { data: items } = await supabase.from('members').select();

        if (items && items.length >= 1) {
            setMembers(items);
            console.log(items)
        }
        setLoading(false);
    }

    useEffect(() => {

        fetchData();

    }, []);

    useEffect(() => {
        const member = members.find(item => String(item.id) === String(selectedID));

        console.log(member);

        if (member)
            setCurrentMember(JSON.stringify(member));

    }, [selectedID])

    function handleCode(id: string) {
        setSelectedID(id);
    }

    const handleClockIn = async () => {

        const member = JSON.parse(currentMember);

        console.log(member['clocked_in'])

        if (member['clocked_in']) {
            alert('Already clocked in!');
            return;
        }

        if (!confirm('Are you sure you wish to clock IN?'))
            return;

        try {
            const { data, error } = await supabase
                .from('time_entries')
                .insert({
                    member_id: String(selectedID),
                    clock_in_time: new Date().toISOString(),
                });


            if (error) throw error;

        } catch (err) {
            alert('Error clocking in:' + JSON.stringify(err));
            console.log('Error clocking in:', (err));
            fetchData();
            return;
        }

        try {
            const { data, error } = await supabase
                .from('members')
                .update({
                    clocked_in: true
                })
                .eq('id', String(selectedID));


            if (error) throw error;

        } catch (err) {
            alert('Error setting clock status:' + err);
            console.log('Error setting clock:', (err));
            fetchData();
            return;
        }

        alert('All good, clocked in member' + member.first_name);

        setCurrentMember(null);
        setSelectedID('');
        fetchData();
    };

    return (
        <div className="relative h-[100dvh]">
            <img
                className="h-[100dvh] brightness-25 w-full object-cover fixed top-0 inset-0 z-1 select-none"
                src="./scan.jpg"
                alt="Scan background"
            />

            {loading && (
                <div className='fixed inset-0 z-50 bg-black/90 flex flex-col justify-center items-center'>
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mb-4"></div>
                    <h2 className='text-3xl text-white font-bold'>Loading Scanner...</h2>
                </div>
            )}

            <div className="relative z-10 h-screen grid grid-rows-[75px_1fr]">

                <div className="bg-black/67 flex flex-row justify-between items-center px-8 select-none">
                    <h1 className="font-bold text-4xl transform hover:translate-x-5 transition duration-350">Card Scanner</h1>
                    <div className="flex flex-row items-center gap-8">
                        <RefreshCcw onClick={fetchData} className="transition cursor-pointer hover:scale-120" size={32} />
                        <Home onClick={() => window.open('/', '_self')} className="transition cursor-pointer hover:scale-120" size={32} />
                    </div>
                </div>
                <div className="grid grid-cols-2">
                    <div className="flex w-full h-full items-center justify-center">
                        <Html5QrcodePlugin
                            fps={10}
                            qrbox={300}
                            disableFlip={false}
                            qrCodeSuccessCallback={(decodedText: string, decodedResult: any) => {
                                handleCode(decodedText);
                            }}
                        />
                    </div>
                    <div className="flex flex-col items-center justify-around">
                        <ul className="flex flex-col max-w-[75%]">
                            <h1 className="text-3xl font-semibold mb-3">How to use scanner</h1>
                            <li>- Place barcode on id-card in front of reader</li>
                            <li>- If id-card is misplaced, use phone to bring up your barcode from the member dashboard</li>
                            <li>- When prompted, click the clock in button below to start your shift</li>
                            <li>- When finished, clock out by using the member dashboard on your phone or this laptop</li>
                        </ul>

                        {currentMember && !JSON.parse(currentMember)['clocked_in'] &&
                            <button onClick={handleClockIn} className="cursor-pointer gap-10 flex flex-row items-center justify-around font-bold color-gray-900 text-4xl bg-gradient-to-r from-green-700/25 to-green-400/25 px-15 py-10 rounded-xl border-green-300/100 border-1 shadow-xl shadow-green-900/40 hover:shadow-green-500/50 hover:scale-105 transition duration-450">
                                Clock in {JSON.parse(currentMember)['first_name'] + ' ' + JSON.parse(currentMember)['last_initial']}
                            </button>
                        }

                        {currentMember && JSON.parse(currentMember)['clocked_in'] &&
                            <div>
                                <h1 className="animate-pulse select-none text-4xl text-red-600 font-semibold">Member already clocked in!</h1>
                            </div>

                        }
                    </div>
                </div>
            </div>
        </div>
    )
}