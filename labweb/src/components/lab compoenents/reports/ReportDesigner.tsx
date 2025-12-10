import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Square, Image, Text, Table, StickyNote, User, Stethoscope } from 'lucide-react';

type ComponentType = 'patient-info' | 'doctor-info' | 'result-table' | 'logo' | 'header-text' | 'notes' | 'signature';

interface LogoData {
  imageUrl: string;
  size: number;
  alignment: 'left' | 'center' | 'right';
}

interface ComponentItem {
  id: string;
  type: ComponentType;
  label: string;
  icon: React.ReactNode;
  data?: any;
  settings?: any;
}

const components: ComponentItem[] = [
  { id: '1', type: 'patient-info', label: 'Patient Info Block', icon: <User className="h-4 w-4" /> },
  { id: '2', type: 'doctor-info', label: 'Doctor Info', icon: <Stethoscope className="h-4 w-4" /> },
  { id: '3', type: 'result-table', label: 'Result Table', icon: <Table className="h-4 w-4" /> },
  { id: '4', type: 'logo', label: 'Logo', icon: <Image className="h-4 w-4" /> },
  { id: '5', type: 'header-text', label: 'Header Text', icon: <Text className="h-4 w-4" /> },
  { id: '6', type: 'notes', label: 'Notes Section', icon: <StickyNote className="h-4 w-4" /> },
];

export function ReportDesigner() {
  const [activeTab, setActiveTab] = useState('style');
  const [fontSize, setFontSize] = useState(12);
  const [headerColor, setHeaderColor] = useState('#2D7FF9');
  const [borderStyle, setBorderStyle] = useState('solid');
  const [reportTitle, setReportTitle] = useState('Medical Laboratory Report');
  const [reportComponents, setReportComponents] = useState<ComponentItem[]>([
    {
      id: 'header-1',
      type: 'header-text',
      label: 'Header',
      icon: <Text className="h-4 w-4" />,
      data: {
        title: 'PATHOLOGY REPORT',
        subtitle: 'Dr. Lab Diagnostic Center',
        address: '123 Medical Drive, Health City, HC 12345',
        contact: 'Phone: (555) 123-4567 | Email: info@drlab.com'
      }
    },
    {
      id: 'patient-1',
      type: 'patient-info',
      label: 'Patient Info',
      icon: <User className="h-4 w-4" />,
      data: {
        name: 'John Smith',
        age: '35',
        gender: 'Male',
        patientId: 'PT123456',
        collectionDate: '2025-11-24',
        reportDate: '2025-11-24',
        referringPhysician: 'Dr. Sarah Johnson'
      }
    },
    {
      id: 'result-table-1',
      type: 'result-table',
      label: 'Results',
      icon: <Table className="h-4 w-4" />,
      data: {
        tests: [
          { test: 'Hemoglobin', result: '14.2', unit: 'g/dL', range: '12.0-16.0' },
          { test: 'Hematocrit', result: '42.5', unit: '%', range: '36.0-48.0' },
          { test: 'White Blood Cells', result: '7.2', unit: 'x10^3/µL', range: '4.5-11.0' },
          { test: 'Red Blood Cells', result: '5.1', unit: 'x10^6/µL', range: '4.2-5.8' },
          { test: 'Platelets', result: '250', unit: 'x10^3/µL', range: '150-400' },
          { test: 'Glucose', result: '98', unit: 'mg/dL', range: '70-100' },
          { test: 'Cholesterol', result: '185', unit: 'mg/dL', range: '<200' },
          { test: 'Triglycerides', result: '120', unit: 'mg/dL', range: '<150' },
          { test: 'HDL', result: '55', unit: 'mg/dL', range: '>40' },
          { test: 'LDL', result: '110', unit: 'mg/dL', range: '<130' }
        ]
      }
    },
    {
      id: 'signature-1',
      type: 'signature',
      label: 'Signature',
      icon: <Square className="h-4 w-4" />,
      data: {
        name: 'Dr. Michael Chen',
        title: 'Pathologist',
        license: 'MD, Board Certified',
        date: 'November 24, 2025'
      }
    }
  ]);
  const [selectedComponent, setSelectedComponent] = useState<ComponentItem | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragStart = (e: React.DragEvent, component: ComponentItem) => {
    e.dataTransfer.setData('component', JSON.stringify(component));
  };

  const addComponent = (component: ComponentItem) => {
    const newComponent = { 
      ...component, 
      id: `${component.id}-${Date.now()}`,
      data: component.type === 'logo' ? {
        imageUrl: '',
        size: 100,
        alignment: 'left'
      } : component.type === 'header-text' ? {
        title: 'MEDICAL LABORATORY REPORT',
        subtitle: 'Accredited by ISO 15189:2012'
      } : null
    };
    setReportComponents([...reportComponents, newComponent]);
    setSelectedComponent(newComponent);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const componentData = JSON.parse(e.dataTransfer.getData('component'));
    addComponent(componentData);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (selectedComponent && selectedComponent.type === 'logo' && event.target?.result) {
        const updatedComponents = reportComponents.map(comp => {
          if (comp.id === selectedComponent.id) {
            return {
              ...comp,
              data: {
                ...comp.data,
                imageUrl: event.target?.result as string
              }
            };
          }
          return comp;
        });
        setReportComponents(updatedComponents);
        setSelectedComponent(updatedComponents.find(c => c.id === selectedComponent.id) || null);
      }
    };
    reader.readAsDataURL(file);
  };

  const updateLogoSetting = (field: string, value: any) => {
    if (!selectedComponent || selectedComponent.type !== 'logo') return;
    
    const updatedComponents = reportComponents.map(comp => {
      if (comp.id === selectedComponent.id) {
        return {
          ...comp,
          data: {
            ...comp.data,
            [field]: value
          }
        };
      }
      return comp;
    });
    setReportComponents(updatedComponents);
    setSelectedComponent(updatedComponents.find(c => c.id === selectedComponent.id) || null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const renderComponent = (component: ComponentItem) => {
    const isSelected = selectedComponent?.id === component.id;
    const componentClasses = `relative group ${isSelected ? 'ring-2 ring-blue-500 rounded' : ''} mb-4`;
    switch (component.type) {
      case 'patient-info':
        return (
          <div className="border-b border-gray-200 pb-4 mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><span className="font-medium">Patient Name:</span> {component.data?.name || 'N/A'}</p>
                <p><span className="font-medium">Age/Gender:</span> {component.data?.age || 'N/A'}/{component.data?.gender || 'N/A'}</p>
                <p><span className="font-medium">Patient ID:</span> {component.data?.patientId || 'N/A'}</p>
              </div>
              <div>
                <p><span className="font-medium">Collection Date:</span> {component.data?.collectionDate || 'N/A'}</p>
                <p><span className="font-medium">Report Date:</span> {component.data?.reportDate || 'N/A'}</p>
              </div>
            </div>
          </div>
        );
      case 'doctor-info':
        return (
          <div className="p-4 border rounded-lg bg-white">
            <h3 className="font-semibold mb-2">Referring Physician</h3>
            <div>{component.data?.referringPhysician || 'N/A'}</div>
            <div className="text-sm text-gray-500">Cardiology</div>
          </div>
        );
      case 'result-table':
        return (
          <div className="border border-gray-300 rounded-b overflow-hidden">
            <div className="bg-blue-700 text-white p-2">
              <h3 className="font-semibold">TEST RESULTS</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left font-semibold border-r border-gray-300">Test Name</th>
                  <th className="p-2 text-center font-semibold border-r border-gray-300">Result</th>
                  <th className="p-2 text-center font-semibold border-r border-gray-300">Units</th>
                  <th className="p-2 text-center font-semibold">Reference Range</th>
                </tr>
              </thead>
              <tbody>
                {component.data?.tests?.map((test: any, index: number) => (
                  <tr key={index} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="p-2 border-r border-gray-200">{test.test}</td>
                    <td className="p-2 text-center border-r border-gray-200">{test.result}</td>
                    <td className="p-2 text-center text-gray-600 border-r border-gray-200">{test.unit}</td>
                    <td className="p-2 text-center">{test.range}</td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-500">No test results available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      case 'logo':
        const logoData = component.data || { imageUrl: '', size: 80, alignment: 'left' };
        const alignmentClass = {
          'left': 'justify-start',
          'center': 'justify-center',
          'right': 'justify-end'
        }[logoData.alignment || 'left'];
        
        return (
          <div className={`flex ${alignmentClass} p-2`}>
            <div 
              className={`bg-white p-1 rounded border ${isSelected ? 'ring-2 ring-blue-500' : 'border-gray-300'}`}
              style={{
                width: `${logoData.size}px`,
                height: 'auto',
                aspectRatio: '1/1'
              }}
            >
              {logoData.imageUrl ? (
                <img 
                  src={logoData.imageUrl} 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs text-center p-1">
                  <span>Click to upload logo</span>
                </div>
              )}
            </div>
          </div>
        );
      case 'header-text':
        return (
          <div className="w-full">
            <div className="bg-blue-700 text-white p-4 rounded-t">
              <div className="flex justify-between items-center">
                <div className="w-16 h-16 bg-white flex items-center justify-center rounded">
                  <span className="text-blue-700 text-xs font-bold">Lab Logo</span>
                </div>
                <div className="text-center">
                  <h1 className="text-xl font-bold uppercase">MEDICAL LABORATORY REPORT</h1>
                  <p className="text-sm font-medium">Accredited by ISO 15189:2012</p>
                </div>
                <div className="w-16"></div> {/* Spacer for alignment */}
              </div>
            </div>
            <div className="bg-white p-4 border-l border-r border-b border-gray-300">
              {/* Patient Info */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-semibold">Name: <span className="font-normal">John Doe</span></p>
                  <p className="font-semibold">Age/Gender: <span className="font-normal">35 Y / M</span></p>
                </div>
                <div>
                  <p className="font-semibold">ID: <span className="font-normal">LAB-12345</span></p>
                  <p className="font-semibold">Date: <span className="font-normal">{new Date().toLocaleDateString()}</span></p>
                </div>
                <div>
                  <p className="font-semibold">Referring Physician:</p>
                  <p className="font-normal">Dr. Sarah Johnson</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'signature':
        return (
          <div className="mt-8 pt-4 border-t border-gray-200">
            <div className="flex justify-between">
              <div>
                <p className="font-medium">Interpretation:</p>
                <p className="text-sm text-gray-600 mt-1">All values are within normal reference ranges.</p>
              </div>
              <div className="text-right">
                <div className="h-12 border-b border-black w-48 mb-1"></div>
                <p className="text-sm font-medium">{component.data?.name || 'Dr. Pathologist'}</p>
                <p className="text-xs text-gray-600">{component.data?.title || 'Pathologist'}</p>
                <p className="text-xs text-gray-500">{component.data?.license || 'MD, Board Certified'}</p>
                <p className="text-xs text-gray-500 mt-1">Date: {component.data?.date || new Date().toLocaleDateString()}</p>
              </div>
            </div>
            <div className="mt-4 text-xs text-center text-gray-500">
              <p>This is an electronically generated report and does not require a physical signature.</p>
              <p className="mt-1">If you have any questions, please contact our lab at (555) 123-4567.</p>
            </div>
          </div>
        );
      
      case 'notes':
        return (
          <div className="p-4 border rounded-lg bg-yellow-50">
            <h3 className="font-semibold mb-2">Notes</h3>
            <p>Results reviewed and verified by laboratory staff.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-blue-700 text-white shadow-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-white">Report Designer</h1>
          <div className="flex space-x-2">
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
              Save
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Components */}
        <div className="w-64 bg-gray-50 border-r border-gray-300 overflow-y-auto">
          <div className="p-3 bg-gray-200 border-b border-gray-300">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Components</h2>
          </div>
          <div className="p-2 space-y-1 bg-white">
            {components.map((component) => (
              <div
                key={component.id}
                draggable
                onDragStart={(e) => handleDragStart(e, component)}
                onClick={() => addComponent(component)}
                className="flex items-center p-2 text-sm text-gray-800 rounded cursor-pointer hover:bg-blue-100 transition-colors border border-transparent hover:border-blue-200"
              >
                <div className="mr-2">{component.icon}</div>
                <span>{component.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Center Panel - Live Preview */}
        <div 
          className="flex-1 overflow-auto bg-white p-6"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => setSelectedComponent(null)}
        >
          <div className="bg-white p-8 max-w-4xl mx-auto border border-gray-200 shadow-sm">
            {reportComponents.length === 0 ? (
              <div className="text-center text-gray-400 p-8 border-2 border-dashed rounded-lg">
                Drag components here to build your report
              </div>
            ) : (
              <div className="space-y-4">
                {reportComponents.map((component) => (
                  <div 
                    key={component.id} 
                    className={`relative group transition-all duration-200 ${selectedComponent?.id === component.id ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedComponent(component === selectedComponent ? null : component);
                    }}
                  >
                    {renderComponent(component)}
                    <button 
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReportComponents(reportComponents.filter(c => c.id !== component.id));
                        if (selectedComponent?.id === component.id) {
                          setSelectedComponent(null);
                        }
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Settings */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wider">
              {selectedComponent ? `${selectedComponent.label} Settings` : 'No Component Selected'}
            </h2>
          </div>
          <div className="p-4">
          {selectedComponent?.type === 'logo' ? (
            <div className="space-y-4">
              <h3 className="font-medium">Logo Settings</h3>
              <div>
                <Label>Logo Image</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {selectedComponent.data?.imageUrl ? 'Change Logo' : 'Upload Logo'}
                  </Button>
                </div>
              </div>
              <div>
                <Label>Size: {selectedComponent.data?.size || 100}px</Label>
                <Slider
                  min={50}
                  max={300}
                  step={10}
                  value={[selectedComponent.data?.size || 100]}
                  onValueChange={(value) => updateLogoSetting('size', value[0])}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Alignment</Label>
                <Select
                  value={selectedComponent.data?.alignment || 'left'}
                  onValueChange={(value) => updateLogoSetting('alignment', value as 'left' | 'center' | 'right')}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select alignment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="style">Style</TabsTrigger>
                <TabsTrigger value="layout">Layout</TabsTrigger>
              </TabsList>
            <TabsContent value="style" className="mt-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fontSize">Font Size: {fontSize}px</Label>
                  <Slider
                    id="fontSize"
                    min={8}
                    max={24}
                    step={1}
                    value={[fontSize]}
                    onValueChange={(value) => setFontSize(value[0])}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="headerColor">Header Color</Label>
                  <div className="flex items-center mt-2">
                    <input
                      type="color"
                      id="headerColor"
                      value={headerColor}
                      onChange={(e) => setHeaderColor(e.target.value)}
                      className="w-10 h-10 p-1 bg-white border border-gray-200 rounded-md mr-2"
                    />
                    <Input
                      value={headerColor}
                      onChange={(e) => setHeaderColor(e.target.value)}
                      className="w-24"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="borderStyle">Border Style</Label>
                  <Select value={borderStyle} onValueChange={setBorderStyle}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select border style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="dashed">Dashed</SelectItem>
                      <SelectItem value="dotted">Dotted</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="layout" className="mt-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reportTitle">Report Title</Label>
                  <Input
                    id="reportTitle"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Page Orientation</Label>
                  <div className="flex space-x-2 mt-2">
                    <Button variant="outline" className="flex-1">
                      Portrait
                    </Button>
                    <Button variant="outline" className="flex-1">
                      Landscape
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Page Size</Label>
                  <Select>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="A4 (210 × 297 mm)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a4">A4 (210 × 297 mm)</SelectItem>
                      <SelectItem value="letter">Letter (8.5 × 11 in)</SelectItem>
                      <SelectItem value="legal">Legal (8.5 × 14 in)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  </div>
);
};

export default ReportDesigner;
