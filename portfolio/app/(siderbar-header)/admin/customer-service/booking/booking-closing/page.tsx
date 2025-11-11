// booking-closing/page.tsx
"use client";

import { ChevronDown, RefreshCw, Search } from 'lucide-react';

// 테이블에 표시될 데이터 타입 정의
type TableData = {
  stream: string;
  module: string;
  fileName: string;
  pageName: string;
  category: string;
  chunk: string;
  semanticTitle: string;
  semanticSummary: string;
  semanticChunk: string;
  language: string;
  date: string;
};

// 목업(Mockup) 데이터: 실제로는 API를 통해 받아오게 됩니다.
const mockData: TableData[] = [
  { stream: 'Commercial', module: 'Basic Slot Allocation', fileName: 'chirographum.pdf', pageName: 'viduo', category: 'umerus', chunk: 'BSA', semanticTitle: 'ante', semanticSummary: 'trado', semanticChunk: 'callide', language: 'Bengali', date: 'Thu Apr 01' },
  { stream: 'Commercial', module: 'Basic Slot Allocation', fileName: 'allatus.pdf', pageName: 'cui', category: 'nostrum', chunk: 'BSA', semanticTitle: 'vulariter', semanticSummary: 'iusto', semanticChunk: 'ulciscor', language: 'Turkish', date: 'Sun Oct 02' },
  { stream: 'Commercial', module: 'Basic Slot Allocation', fileName: 'bis.pdf', pageName: 'articulus', category: 'vulgaris', chunk: 'BSA', semanticTitle: 'voluptate', semanticSummary: 'conculco', semanticChunk: 'pel', language: 'Thai', date: 'Sun Oct 02' },
  { stream: 'Commercial', module: 'Basic Slot Allocation', fileName: 'currus.png', pageName: 'cruciamentum', category: 'celer', chunk: 'BSA', semanticTitle: 'spes', semanticSummary: 'decretum', semanticChunk: 'crebro', language: 'Slovak', date: 'Mon Sep 01' },
  { stream: 'Commercial', module: 'Basic Slot Allocation', fileName: 'eum.png', pageName: 'adsum', category: 'desolo', chunk: 'BSA', semanticTitle: 'ducimus', semanticSummary: 'tamquam', semanticChunk: 'cena', language: 'Italian', date: 'Fri Nov 08' },
  { stream: 'Commercial', module: 'Basic Slot Allocation', fileName: 'ullam.png', pageName: 'super', category: 'rerum', chunk: 'BSA', semanticTitle: 'defungo', semanticSummary: 'amo', semanticChunk: 'carpo', language: 'French', date: 'Fri May 01' },
  { stream: 'Commercial', module: 'Basic Slot Allocation', fileName: 'enim.png', pageName: 'caelestis', category: 'apud', chunk: 'BSA', semanticTitle: 'tamdiu', semanticSummary: 'cresco', semanticChunk: 'viridis', language: 'Zulu', date: 'Sun Oct 01' },
  { stream: 'Commercial', module: 'Basic Slot Allocation', fileName: 'illum.png', pageName: 'arma', category: 'vulnero', chunk: 'BSA', semanticTitle: 'clamo', semanticSummary: 'demens', semanticChunk: 'pariatur', language: 'Uzbek', date: 'Mon Feb 01' },
  { stream: 'Commercial', module: 'Basic Slot Allocation', fileName: 'aqua.pdf', pageName: 'spargo', category: 'thorax', chunk: 'BSA', semanticTitle: 'vado', semanticSummary: 'bardus', semanticChunk: 'cavus', language: 'Korean', date: 'Thu Mar 01' },
  { stream: 'Commercial', module: 'Basic Slot Allocation', fileName: 'tyrannus.pdf', pageName: 'acidus', category: 'assentator', chunk: 'BSA', semanticTitle: 'suppono', semanticSummary: 'odit', semanticChunk: 'civitas', language: 'Farsi/Persian', date: 'Sun Jun 02' },
];

export default function KnowledgeBasePage() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      {/* Breadcrumb Navigation */}
      <div className="text-sm text-gray-500 mb-4">
        챗봇 응답 지식 관리 <span className="mx-1">/</span>
        지식 청크 관리 <span className="mx-1">/</span>
        Commercial <span className="mx-1">/</span>
        <span className="text-gray-800 font-semibold"> Basic Slot Allocation(BSA)</span>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        {/* Filters and Search Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-4">
          <div className="flex flex-col">
            <label htmlFor="stream" className="text-xs font-medium text-gray-600 mb-1">Stream</label>
            <select id="stream" className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option>All</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="module01" className="text-xs font-medium text-gray-600 mb-1">Module 01</label>
            <select id="module01" className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option>All</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="module02" className="text-xs font-medium text-gray-600 mb-1">Module 02</label>
            <select id="module02" className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option>All</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="status" className="text-xs font-medium text-gray-600 mb-1">Status</label>
            <select id="status" className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option>All</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="category" className="text-xs font-medium text-gray-600 mb-1">Category</label>
            <select id="category" className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option>All</option>
            </select>
          </div>
          <div className="flex flex-col col-span-1 lg:col-span-2">
            <label htmlFor="search" className="text-xs font-medium text-gray-600 mb-1">Search</label>
            <div className="flex items-center">
              <input 
                id="search"
                type="text" 
                placeholder="Please enter your search item" 
                className="border border-gray-300 rounded-l-md px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button className="p-2 border-y border-r border-gray-300 text-gray-500 hover:bg-gray-100">
                <RefreshCw size={18} />
              </button>
              <button className="bg-blue-600 text-white px-6 py-2 rounded-r-md font-semibold text-sm hover:bg-blue-700">
                SEARCH
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Stream', 'Module', 'File Name', 'Page Name', 'Category', 'Chunk', 'Semantic Title', 'Semantic Summary', 'Semantic Chunk', 'Language', 'Date'].map(header => (
                  <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{item.stream}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{item.module}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{item.fileName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{item.pageName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{item.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{item.chunk}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{item.semanticTitle}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{item.semanticSummary}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{item.semanticChunk}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{item.language}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{item.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}