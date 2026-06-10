import Navbar from "@/components/Navbar";
import LeadOpsFloatingPanel from "@/components/leads/LeadOpsFloatingPanel";

const InicioPage = () => {
  return (
    <div className="fixed inset-0 size-full overflow-hidden bg-black" data-camera-page-root>
      <Navbar />
      <LeadOpsFloatingPanel />
    </div>
  );
};

export default InicioPage;
