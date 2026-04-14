"use client"

import React from 'react';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip } from 'recharts';

interface BenchmarkingRadarProps {
  data: {
    subject: string;
    A: number; // Our Project
    B: number; // Competitor/Industry Average
    fullMark: number;
  }[];
}

const BenchmarkingRadar: React.FC<BenchmarkingRadarProps> = ({ data }) => {
  return (
    <div className="w-full h-[250px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} 
          />
          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.9)', 
              borderRadius: '16px', 
              border: 'none',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              fontSize: '12px',
              fontWeight: 700
            }}
          />
          <Radar
            name="Notre Projet"
            dataKey="A"
            stroke="#00CCCC"
            fill="#00CCCC"
            fillOpacity={0.4}
          />
          <Radar
            name="Moyenne Industrie"
            dataKey="B"
            stroke="#FF0000"
            fill="#FF0000"
            fillOpacity={0.2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BenchmarkingRadar;
