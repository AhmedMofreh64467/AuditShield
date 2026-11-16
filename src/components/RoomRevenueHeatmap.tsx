import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Flame } from 'lucide-react';
import { LanguageCode } from '../i18n/translations';
import { HotelConfig, HotelRoom, RoomFolioItem } from '../types/audit';
import { formatMoney } from '../utils/auditEngine';

interface RoomRevenueHeatmapProps {
  lang: LanguageCode;
  config: HotelConfig;
  rooms: HotelRoom[];
  folioItems: RoomFolioItem[];
}

interface HeatmapCellData {
  floor: string;
  roomType: string;
  roomCount: number;
  occupiedCount: number;
  revenue: number;
  folioCharges: number;
  ratePotential: number;
  roomNumbers: string[];
}

export const RoomRevenueHeatmap: React.FC<RoomRevenueHeatmapProps> = ({
  lang,
  config,
  rooms,
  folioItems,
}) => {
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [mode, setMode] = useState<'realized' | 'potential'>('realized');
  const [containerWidth, setContainerWidth] = useState(760);
  const [hoveredCell, setHoveredCell] = useState<HeatmapCellData | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => {
      const next = Math.max(460, Math.floor(el.clientWidth));
      setContainerWidth(next);
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { floors, roomTypes, cells, maxValue } = useMemo(() => {
    const floorSet = new Set<string>();
    const typeSet = new Set<string>();

    const folioByRoom = new Map<string, number>();
    for (const fi of folioItems) {
      if (fi.amount > 0) {
        folioByRoom.set(fi.roomId, (folioByRoom.get(fi.roomId) ?? 0) + fi.amount);
      }
    }

    const cellMap = new Map<string, HeatmapCellData>();

    for (const room of rooms) {
      floorSet.add(room.floor);
      typeSet.add(room.roomType);
      const key = `${room.floor}__${room.roomType}`;
      const roomFolio = folioByRoom.get(room.id) ?? 0;
      const isActiveOccupied = room.status === 'Occupied';
      const activeRate = isActiveOccupied ? room.baseRate : 0;
      const realizedRoomRev = roomFolio > 0 ? roomFolio : activeRate;

      const existing = cellMap.get(key);
      if (existing) {
        existing.roomCount += 1;
        existing.occupiedCount += isActiveOccupied ? 1 : 0;
        existing.folioCharges += realizedRoomRev;
        existing.ratePotential += room.baseRate;
        existing.revenue = mode === 'realized' ? existing.folioCharges : existing.ratePotential;
        existing.roomNumbers.push(room.roomNumber);
      } else {
        cellMap.set(key, {
          floor: room.floor,
          roomType: room.roomType,
          roomCount: 1,
          occupiedCount: isActiveOccupied ? 1 : 0,
          folioCharges: realizedRoomRev,
          ratePotential: room.baseRate,
          revenue: mode === 'realized' ? realizedRoomRev : room.baseRate,
          roomNumbers: [room.roomNumber],
        });
      }
    }

    const sortedFloors = Array.from(floorSet).sort((a, b) =>
      b.localeCompare(a, undefined, { numeric: true })
    );
    const sortedTypes = Array.from(typeSet).sort((a, b) => a.localeCompare(b));

    const allCells: HeatmapCellData[] = [];
    for (const fl of sortedFloors) {
      for (const rt of sortedTypes) {
        const key = `${fl}__${rt}`;
        const found = cellMap.get(key);
        if (found) {
          allCells.push(found);
        } else {
          allCells.push({
            floor: fl,
            roomType: rt,
            roomCount: 0,
            occupiedCount: 0,
            folioCharges: 0,
            ratePotential: 0,
            revenue: 0,
            roomNumbers: [],
          });
        }
      }
    }

    const maxVal = Math.max(
      1,
      ...allCells.map((c) => c.revenue)
    );

    return {
      floors: sortedFloors,
      roomTypes: sortedTypes,
      cells: allCells,
      maxValue: maxVal,
    };
  }, [rooms, folioItems, mode]);

  useEffect(() => {
    const svgNode = svgRef.current;
    if (!svgNode || floors.length === 0 || roomTypes.length === 0) return;

    const svg = d3.select(svgNode);
    svg.selectAll('*').remove();

    const margin = { top: 36, right: 24, bottom: 56, left: 78 };
    const cellHeight = 52;
    const innerHeight = Math.max(160, floors.length * cellHeight);
    const totalHeight = innerHeight + margin.top + margin.bottom;
    const width = Math.max(520, containerWidth);
    const innerWidth = width - margin.left - margin.right;

    svg.attr('viewBox', `0 0 ${width} ${totalHeight}`).attr('height', totalHeight);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleBand<string>()
      .domain(roomTypes)
      .range([0, innerWidth])
      .padding(0.08);

    const yScale = d3
      .scaleBand<string>()
      .domain(floors)
      .range([0, innerHeight])
      .padding(0.12);

    const colorScale = d3
      .scaleSequential<string>()
      .domain([0, maxValue])
      .interpolator(
        d3.interpolateRgbBasis(['#EFF6FF', '#7DD3FC', '#0088CC', '#0F1E36'])
      );

    // X Axis (Room Types)
    const xAxisGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickSize(0));

    xAxisGroup.select('.domain').remove();
    xAxisGroup
      .selectAll('text')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', '#334155')
      .attr('dy', '1.1em');

    // Y Axis (Floors)
    const yAxisGroup = g.append('g').call(
      d3
        .axisLeft(yScale)
        .tickSize(0)
        .tickFormat((fl) => (isAr ? `طابق ${fl}` : isFr ? `Étage ${fl}` : `Floor ${fl}`))
    );

    yAxisGroup.select('.domain').remove();
    yAxisGroup
      .selectAll('text')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', '#334155')
      .attr('dx', '-0.6em');

    // Top-right axis title
    g.append('text')
      .attr('x', 0)
      .attr('y', -14)
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', '#64748B')
      .text(
        isAr
          ? `كثافة الإيرادات (${config.currency})`
          : isFr
          ? `Densité des Revenus (${config.currency})`
          : `Revenue Density (${config.currency})`
      );

    // Cells
    const cellGroups = g
      .selectAll('g.heatmap-cell')
      .data(cells)
      .enter()
      .append('g')
      .attr('class', 'heatmap-cell')
      .style('cursor', (d) => (d.roomCount > 0 ? 'pointer' : 'default'))
      .on('mouseenter', (_event, d) => {
        setHoveredCell(d);
      })
      .on('mouseleave', () => {
        setHoveredCell(null);
      });

    cellGroups
      .append('rect')
      .attr('x', (d) => xScale(d.roomType) ?? 0)
      .attr('y', (d) => yScale(d.floor) ?? 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', (d) => {
        if (d.roomCount === 0) return '#F8FAFC';
        if (d.revenue <= 0) return '#F1F5F9';
        return colorScale(d.revenue);
      })
      .attr('stroke', (d) => (d.roomCount === 0 ? '#E2E8F0' : '#CBD5E1'))
      .attr('stroke-dasharray', (d) => (d.roomCount === 0 ? '3,3' : 'none'))
      .attr('stroke-width', 1);

    // Revenue label inside cell
    cellGroups
      .append('text')
      .attr('x', (d) => (xScale(d.roomType) ?? 0) + xScale.bandwidth() / 2)
      .attr('y', (d) => (yScale(d.floor) ?? 0) + yScale.bandwidth() / 2 - 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
      .style('font-size', '11px')
      .style('font-weight', '700')
      .style('pointer-events', 'none')
      .style('fill', (d) => {
        if (d.roomCount === 0 || d.revenue <= 0) return '#94A3B8';
        return d.revenue / maxValue > 0.52 ? '#FFFFFF' : '#0F172A';
      })
      .text((d) => {
        if (d.roomCount === 0) return '—';
        if (d.revenue <= 0) return '0';
        return Math.round(d.revenue).toLocaleString('en-US');
      });

    // Sub-label showing room count inside cell
    cellGroups
      .append('text')
      .attr('x', (d) => (xScale(d.roomType) ?? 0) + xScale.bandwidth() / 2)
      .attr('y', (d) => (yScale(d.floor) ?? 0) + yScale.bandwidth() / 2 + 12)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '9.5px')
      .style('font-weight', '500')
      .style('pointer-events', 'none')
      .style('fill', (d) => {
        if (d.roomCount === 0) return '#CBD5E1';
        return d.revenue / maxValue > 0.52 ? 'rgba(255,255,255,0.85)' : '#475569';
      })
      .text((d) =>
        d.roomCount === 0
          ? ''
          : `${d.occupiedCount}/${d.roomCount} ${isAr ? 'غرف' : 'rm'}`
      );

    // D3 Gradient Legend along bottom
    const defs = svg.append('defs');
    const grad = defs
      .append('linearGradient')
      .attr('id', 'room-heatmap-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    [0, 0.35, 0.7, 1].forEach((stop) => {
      grad
        .append('stop')
        .attr('offset', `${stop * 100}%`)
        .attr('stop-color', colorScale(stop * maxValue));
    });

    const legendWidth = Math.min(240, innerWidth * 0.45);
    const legendGroup = g
      .append('g')
      .attr('transform', `translate(${innerWidth - legendWidth}, ${innerHeight + 34})`);

    legendGroup
      .append('rect')
      .attr('width', legendWidth)
      .attr('height', 8)
      .attr('rx', 4)
      .style('fill', 'url(#room-heatmap-gradient)');

    legendGroup
      .append('text')
      .attr('x', 0)
      .attr('y', 20)
      .style('font-size', '10px')
      .style('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
      .style('fill', '#64748B')
      .text('0');

    legendGroup
      .append('text')
      .attr('x', legendWidth)
      .attr('y', 20)
      .attr('text-anchor', 'end')
      .style('font-size', '10px')
      .style('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
      .style('fill', '#0F172A')
      .style('font-weight', '600')
      .text(`${Math.round(maxValue).toLocaleString('en-US')} ${config.currency}`);
  }, [cells, floors, roomTypes, maxValue, containerWidth, config.currency, isAr, isFr]);

  return (
    <section
      aria-label={isAr ? 'خريطة كثافة إيرادات الغرف حسب الطابق والفئة' : 'Room Revenue Heatmap'}
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-[#0088CC] shrink-0" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {isAr
                ? 'خريطة كثافة إيرادات الغرف حسب الطابق والفئة (D3 Heatmap)'
                : isFr
                ? 'Carte Thermique des Revenus par Étage et Catégorie (D3)'
                : 'Room Revenue Density by Floor & Room Type (D3 Heatmap)'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAr
                ? 'توزيع الإيراد الفعلي وإشغال الغرف عبر طوابق الفندق وفئات الغرف لاكتشاف أعلى المناطق ربحية'
                : isFr
                ? 'Visualisation D3 de la densité des revenus par étage et type de chambre'
                : 'Interactive D3 density matrix across hotel floors and room types'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setMode('realized')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              mode === 'realized'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isAr ? 'الإيراد المحقق والفواتير' : isFr ? 'Revenu Réalisé' : 'Realized & Folio'}
          </button>
          <button
            type="button"
            onClick={() => setMode('potential')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              mode === 'potential'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isAr ? 'إجمالي طاقة الأسعار (Rack)' : isFr ? 'Capacité Tarifaire' : 'Full Rate Capacity'}
          </button>
        </div>
      </div>

      <div className="p-5 space-y-3">
        {rooms.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            {isAr
              ? 'أضف غرفاً في قسم الغرف (Room Rack) لعرض الخريطة الحرارية للإيرادات.'
              : 'Add rooms in Room Rack to render the revenue density heatmap.'}
          </div>
        ) : (
          <>
            <div ref={containerRef} className="w-full overflow-x-auto" dir="ltr">
              <svg ref={svgRef} className="w-full min-w-[520px] block select-none" />
            </div>

            {/* Interactive Hover Detail Strip */}
            <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs min-h-[42px]">
              {hoveredCell ? (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-slate-900">
                      {isAr ? `طابق ${hoveredCell.floor}` : `Floor ${hoveredCell.floor}`} ·{' '}
                      {hoveredCell.roomType}
                    </span>
                    <span className="text-slate-500 font-mono">
                      {hoveredCell.roomCount > 0
                        ? `${hoveredCell.occupiedCount}/${hoveredCell.roomCount} ${
                            isAr ? 'مسكونة' : 'occupied'
                          } (${hoveredCell.roomNumbers.map((n) => `#${n}`).join(', ')})`
                        : isAr
                        ? 'لا توجد غرف من هذه الفئة في هذا الطابق'
                        : 'No rooms in this floor/type cell'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-[#0088CC]" dir="ltr">
                    {formatMoney(hoveredCell.revenue, config.currency)}
                  </span>
                </>
              ) : (
                <span className="text-slate-500">
                  {isAr
                    ? 'مرّر المؤشر على أي خلية في الخريطة لعرض أرقام الغرف وتفاصيل الإيراد.'
                    : isFr
                    ? 'Survolez une cellule pour afficher les détails des chambres et revenus.'
                    : 'Hover over any matrix cell to inspect room numbers, occupancy, and revenue density.'}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
