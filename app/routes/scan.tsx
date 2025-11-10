import { Home, RefreshCcw } from "lucide-react";
import Html5QrcodePlugin from "public/html5QrcodePlugin";
import { supabase } from "public/supabase";
import { useEffect, useState } from "react";
import positiveSound from 'public/sounds/applepay.mp3';
import failedSound from 'public/sounds/apple-pay-failed.mp3';

export default function Scan() {

    const [currentMember, setCurrentMember] = useState<any>();
    const [members, setMembers] = useState<any[]>([]);

    const [selectedBarcodeID, setSelectedBarcodeID] = useState<number>();

    const [loading, setLoading] = useState(true);

    const [showClockInLoading, setShowClockInLoading] = useState<boolean>(false);
    const [showClockInSuccess, setShowClockInSuccess] = useState<boolean>(false);

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const playPositive = () => {
        const audio = new Audio(positiveSound);
        audio.play();
    };
    
    const playFailed = () => {
        const audio = new Audio(failedSound);
        audio.play();
    };

    async function fetchData() {
        setShowClockInLoading(false);
        setShowClockInSuccess(false);
        setLoading(true);
        const { data: items } = await supabase.from('members').select();

        setCurrentMember(null);

        setSelectedBarcodeID(-1);

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
        const member = members.find(item => item.id_barcode === selectedBarcodeID);

        console.log(member);

        if (member)
            setCurrentMember(JSON.stringify(member));

        if (member && !member['clocked_in']) 
            handleClockIn(JSON.stringify(member));

        if (member && member['clocked_in']) 
            playFailed();

    }, [selectedBarcodeID])

    function handleCode(id: string) {
        setSelectedBarcodeID(parseInt(id));
    }

    const handleClockIn = async (data: string = currentMember) => {

        const member = JSON.parse(data);

        console.log(member['clocked_in'])

        if (member['clocked_in']) {
            alert('Already clocked in!');
            return;
        }

        setShowClockInLoading(true);

        try {
            const { data, error } = await supabase
                .from('time_entries')
                .insert({
                    member_id: String(member.id),
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
                .eq('id_barcode', selectedBarcodeID ?? -1);


            if (error) throw error;

        } catch (err) {
            alert('Error setting clock status:' + err);
            console.log('Error setting clock:', (err));
            fetchData();
            return;
        }

        await sleep(500);
        setShowClockInLoading(false);
        setShowClockInSuccess(true);

        playPositive();

        await sleep(2250);

        fetchData();
    };

    return (
        <div className="relative h-[100dvh] text-white">
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

            {showClockInLoading && (
                <div className='fixed inset-0 z-50 bg-black/85 flex flex-col justify-center items-center'>
                    <div className="bg-black/10 w-auto items-center py-15 px-25 h-auto backdrop-blur-xs rounded-lg border-1 flex flex-col border-gray-500 shadow-2xl">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-green-400 border-t-transparent mb-4"></div>
                        <h2 className='text-3xl text-white font-bold'>Clocking in {currentMember && JSON.parse(currentMember)['first_name']}...</h2>
                    </div>
                </div>
            )}

            {showClockInSuccess && (
                <div className='fixed inset-0 z-50 bg-green-900/50 flex flex-col justify-center items-center'>
                    <div className="max-w-md bg-black/75 w-auto items-center py-15 px-25 h-auto backdrop-blur-xs rounded-lg border-1 flex flex-col border-green-300/67 shadow-2xl">
                        <h2 className='text-4xl text-white font-semibold text-center'>Successfully clocked in {currentMember && JSON.parse(currentMember)['first_name']}!</h2>
                    </div>
                </div>
            )}

            {true && (
                <div className='fixed md:hidden inset-0 z-50 bg-black/90 flex flex-col justify-center items-center gap-5'>
                    <h2 className='text-2xl text-white font-bold mx-5'>This page requires a larger screen to visit. Try using a laptop.</h2>
                    <a href="/" className="text-orange-400">Return Home</a>
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
                            <li>- Place qr-code of id card near scanner</li>
                            <li>- If id card is misplaced, use phone to bring up qr code from the member dashboard, located at the top next to first name</li>
                            <li>- To clock out, use the member dashboard on your phone or admin page on this laptop</li>
                        </ul>

                        {currentMember && !JSON.parse(currentMember)['clocked_in'] &&
                            <button onClick={() => handleClockIn(currentMember)} className="cursor-pointer gap-10 flex flex-row items-center justify-around font-bold color-gray-900 text-4xl bg-gradient-to-r from-green-700/25 to-green-400/25 px-15 py-10 rounded-xl border-green-300/100 border-1 shadow-xl shadow-green-900/40 hover:shadow-green-500/50 hover:scale-105 transition duration-450">
                                Clock in {JSON.parse(currentMember)['first_name'] + ' ' + JSON.parse(currentMember)['last_initial']}
                            </button>
                        }

                        {currentMember && JSON.parse(currentMember)['clocked_in'] &&
                            <div>
                                <h1 className="animate-pulse select-none text-4xl text-red-500 font-semibold">Member already clocked in!</h1>
                            </div>

                        }
                    </div>
                </div>
            </div>
        </div>
    );
}