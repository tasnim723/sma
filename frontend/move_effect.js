const fs = require('fs');
let c = fs.readFileSync('components/projects/CreateProjectWizard.tsx', 'utf8');

// The block to move
const blockToMove = `  const [dynamicSimulation, setDynamicSimulation] = useState<{score: number, level: string, summary: string, risks: string[]} | null>(null);
  const [isSimulatingLive, setIsSimulatingLive] = useState(false);
  const simTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!feasibilityData || !selectedProject) return;
    if (simTimeoutRef.current) clearTimeout(simTimeoutRef.current);
    setIsSimulatingLive(true);
    simTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await axios.post("/api/wizard/simulate-feasibility-live", {
           project_title: selectedProject.title,
           project_description: selectedProject.description || "",
           budget_pressure: budgetPressure,
           time_pressure: timePressure,
           base_score: feasibilityData.feasibility_score
        });
        setDynamicSimulation(res.data);
      } catch(e) {
        console.error(e);
      } finally {
        setIsSimulatingLive(false);
      }
    }, 800);
  }, [budgetPressure, timePressure, feasibilityData, selectedProject]);`;

// Remove it from its current position
c = c.replace(blockToMove, '');

// Insert it right below isLoadingFeasibility
const target = `  const [isLoadingFeasibility, setIsLoadingFeasibility] = useState(false)`;
c = c.replace(target, target + "\n\n" + blockToMove);

fs.writeFileSync('components/projects/CreateProjectWizard.tsx', c);
