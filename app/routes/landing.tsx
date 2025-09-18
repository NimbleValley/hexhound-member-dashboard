import { useEffect, useState } from "react";
import { supabase } from "public/supabase";

export default function Home() {

  const [memberNames, setMemberNames] = useState<string[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>(null);

  useEffect(() => {
    async function getMembers() {
      const { data: names } = await supabase.from('members').select();

      if (names && names.length >= 1) {
        setMemberNames(names);
      }
    }

    getMembers();
  }, []);

  const handleEnterDashboard = () => {
    if (selectedMember) {

      if(selectedMember == 'ADMIN') {
        return;
      }

      if(selectedMember == 'SCANNER') {
        window.open(`/scan`, '_self');
        return;
      }

      sessionStorage.setItem('currentMember', selectedMember);
      console.log(selectedMember);
      window.open(`/dashboard`, '_self');
    } else {
      alert('Please select your name first');
    }
  };

  return (
    <div className="relative h-[100dvh]">
      <img
        className="h-[100dvh] brightness-50 w-full object-cover fixed top-0 inset-0 z-0"
        src="./landing.jpg"
        alt="Landing background"
      />

      <div className="relative z-10 h-[100dvh] flex flex-col justify-center items-center px-8">

        <div className="text-center mb-12">
          <h1 className="text-6xl md:text-7xl font-bold text-white drop-shadow-2xl mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Hexhound
          </h1>
          <h2 className="text-2xl md:text-3xl font-light text-gray-200 drop-shadow-lg">
            Member Dashboard
          </h2>
        </div>

        <div className="mb-12">
          <img
            className="h-24 w-32 drop-shadow-2xl hover:scale-105 transition-transform duration-300"
            src="./icon.png"
            alt="Hexhound logo"
          />
        </div>

        <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl max-w-md w-full">
          <div className="space-y-6">

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Select Your Name
              </label>
              <select onChange={(e) => setSelectedMember(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 backdrop-blur-sm focus:outline-none cursor-poin focus:ring-2 focus:ring-white/75 focus:border-transparent transition-all duration-300">
                <option value="" className="text-gray-800">Choose your name...</option>
                <option value="SCANNER" className="text-gray-800">SCANNER</option>
                <option value="ADMIN" className="text-gray-800">ADMIN</option>
                {
                  memberNames.sort((a, b) => {return a.localeCompare(b)}).map((item, index) => (
                    <option key={index} value={JSON.stringify(item)} className="text-gray-800">{`${item['first_name']} ${item['last_initial']}`}</option>
                  ))
                }
              </select>
            </div>

            <button onClick={handleEnterDashboard} className="w-full bg-gradient-to-r from-orange-900 to-orange-500 cursor-pointer hover:from-orange-700 hover:to-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-white/75">
              Enter Dashboard
            </button>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-orange-200 text-sm">
            Welcome to the team portal, the place for team members to clock in, view hours, count scouting statistics, and engage in friendly competition
          </p>
        </div>
      </div>
    </div>
  );
}