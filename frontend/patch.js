const fs = require('fs');
let c = fs.readFileSync('components/projects/CreateProjectWizard.tsx', 'utf8');

c = c.replace(
  /simulatedScore = Math\.max\(10, Math\.min\(100, Math\.round\(feasibilityData\.feasibility_score \* \(budgetPressure \/ 100\) \* \(timePressure \/ 100\)\)\)\);/,
  "simulatedScore = dynamicSimulation ? dynamicSimulation.score : Math.max(10, Math.min(100, Math.round(feasibilityData.feasibility_score * (budgetPressure / 100) * (timePressure / 100))));"
);

c = c.replace(
  /displayedSummary = feasibilityData\.summary;/,
  'displayedSummary = isSimulatingLive ? "Analyse dynamique en cours..." : (dynamicSimulation ? dynamicSimulation.summary : feasibilityData.summary);'
);

c = c.replace(
  /\/\/ Dynamic level tag based on simulatedScore[\s\S]*?: 'CRITIQUE';/,
  `// Dynamic level tag based on simulatedScore
    simulatedLevel = dynamicSimulation ? dynamicSimulation.level : (simulatedScore >= 80 ? 'EXCELLENT'
      : simulatedScore >= 65 ? 'VIABLE'
        : simulatedScore >= 50 ? 'MODÉRÉ'
          : simulatedScore >= 35 ? 'RISQUÉ'
            : 'CRITIQUE');`
);

c = c.replace(
  /dynamicRisks = \[\.\.\.\(feasibilityData\.risk\?\.main_risks \|\| \[\]\)\];/,
  "dynamicRisks = dynamicSimulation ? dynamicSimulation.risks : [...(feasibilityData.risk?.main_risks || [])];"
);

fs.writeFileSync('components/projects/CreateProjectWizard.tsx', c);
