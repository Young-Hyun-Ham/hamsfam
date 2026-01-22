// app/(content-header)/builder/page.tsx
"use client";
import { useEffect, useState } from 'react';

import ScenarioList from './components/List';
import ScenarioDetail from './components/Detail';
import HelpModal from './components/modals/HelpModal';
import ScenarioModal from './components/modals/ScenarioModal';

import * as backendService from './services/backendService';
import { Scenarios } from './types/types';

import useBuilderStore from './store/index';

const Scenario = () => {

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [view, setView] = useState('list');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [scenarios, setScenarios] = useState<Scenarios[]>([]);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState({
    id: '',
    name: '',
  });
  const backend = useBuilderStore(s => s.backend);
  const hasScenario = !!selectedScenario && Object.keys(selectedScenario).length > 0;
  
  useEffect(() => {
    // 메뉴에서 던진 이벤트 받기
    const onReset = () => setSelectedScenario(null);
    window.addEventListener('builder:reset', onReset);
    return () => window.removeEventListener('builder:reset', onReset);
  }, []);

  const handleScenarioSelect = async (scenario: any) => {
    try {
      const updatedScenarioData = await backendService.updateScenarioLastUsed(backend, { scenarioId: scenario.id });
      
      const newLastUsedAt = updatedScenarioData.lastUsedAt || (updatedScenarioData.last_used_at ? new Date(updatedScenarioData.last_used_at) : new Date());

      setScenarios((prevScenarios: any) => 
        prevScenarios.map((s: any) => 
          s.id === scenario.id 
          ? { ...s, lastUsedAt: newLastUsedAt } 
          : s
        )
      );
      
      setSelectedScenario({ ...scenario, lastUsedAt: newLastUsedAt });
      
    } catch (error) {
      console.error("Failed to update last used time:", error);
      setSelectedScenario(scenario);
    } finally {
      setView('flow');
    }
  };
  
  const handleOpenAddScenarioModal = () => {
    setEditingScenario({
      id: '', 
      name: '',
    });
    setIsScenarioModalOpen(true);
  };

  const handleOpenEditScenarioModal = (scenario: any) => {
    setEditingScenario(scenario);
    setIsScenarioModalOpen(true);
  };

  const handleSaveScenario = async ({ name, job, description }: any) => {
    try {
      if (editingScenario.id) {
        if (name !== editingScenario.name && scenarios.some((s: any) => s.name === name)) {
          alert("A scenario with that name already exists.");
          return;
        }
        await backendService.renameScenario(backend, { oldScenario: editingScenario, newName: name, job, description });
        setScenarios((prev: any) => prev.map((s: any) => (s.id === editingScenario.id ? { ...s, name, job, description } : s)));
        alert('Scenario updated successfully.');
      } else {
        if (scenarios.some((s: any) => s.name === name)) {
          alert("A scenario with that name already exists.");
          return;
        }
        const newScenario = await backendService.createScenario(backend, { newScenarioName: name, job, description });
         
        setScenarios(prev => [...prev, { ...newScenario, lastUsedAt: null }]); 
        setSelectedScenario({ ...newScenario, lastUsedAt: null });
        setView('flow');
        alert(`Scenario '${newScenario.name}' has been created.`);
      }
      setIsScenarioModalOpen(false);
      setEditingScenario({
        id: '',
        name: '',
      });
    } catch (error: any) {
      console.error("Error saving scenario: ", error);
      alert(`Failed to save scenario: ${error.message}`);
    }
  };

  const onClose = () => {
    setSelectedScenario(null);
  }

  return (
    <>
      {hasScenario ? 
        <ScenarioDetail 
          scenario={selectedScenario} 
          backend={backend} 
          scenarios={scenarios}
          onClose={onClose}
        /> : 
        <ScenarioList 
          backend={backend}
          onSelect={handleScenarioSelect} 
          onAddScenario={handleOpenAddScenarioModal}
          onEditScenario={handleOpenEditScenarioModal}
          scenarios={scenarios}
          setScenarios={setScenarios}
        />
      }
      
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
      <ScenarioModal 
        isOpen={isScenarioModalOpen}
        onClose={() => { setIsScenarioModalOpen(false); setEditingScenario({id: '', name: '',}); }}
        onSave={handleSaveScenario}
        scenario={editingScenario}
      />
    </>
  );
};

export default Scenario;
