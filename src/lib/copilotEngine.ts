import {
  type Project,
  type PropertyUnit,
  type Lead,
  type Broker,
  type BookingRecord,
  type UserRole,
  getUnitAllInclusivePrice,
} from '../store/useSolexStore';
import { formatInr } from './formatters';

export interface CopilotContextInput {
  query: string;
  role: UserRole;
  activeBrokerId: string;
  selectedProjectId: string;
  projects: Project[];
  units: PropertyUnit[];
  leads: Lead[];
  brokers: Broker[];
  bookings: BookingRecord[];
}

export function generateLiveMandateResponse(ctx: CopilotContextInput): string {
  const q = ctx.query.toLowerCase().trim();
  const activeProject =
    ctx.projects.find((p) => p.id === ctx.selectedProjectId) || ctx.projects[0];
  const activeBroker = ctx.brokers.find((b) => b.id === ctx.activeBrokerId);

  // Detect if a specific project is mentioned in the query
  const targetProject =
    ctx.projects.find((p) => q.includes(p.name.toLowerCase())) ||
    ctx.projects.find((p) =>
      p.name
        .toLowerCase()
        .split(' ')
        .some((word) => word.length > 3 && q.includes(word))
    ) ||
    activeProject;

  const projectUnits = ctx.units.filter((u) => u.projectId === targetProject.id);
  const availUnits = projectUnits.filter((u) => u.status === 'Available');
  const holdUnits = projectUnits.filter((u) => u.status === 'Hold');
  const soldUnits = projectUnits.filter((u) => u.status === 'Sold');

  // Detect if a specific buyer/lead is mentioned
  const matchedLead = ctx.leads.find((l) =>
    l.buyerName
      .toLowerCase()
      .split(/\s+/)
      .some((part) => part.length > 3 && q.includes(part.replace(/[^a-z]/g, '')))
  );

  // 1. Lead / Buyer Match Query (e.g., "Best unit in Skyline Towers for Siddharth Kapoor")
  if (matchedLead || q.includes('best unit') || q.includes('recommend') || q.includes('match')) {
    const lead =
      matchedLead ||
      (ctx.role === 'Broker'
        ? ctx.leads.find((l) => l.assignedBrokerId === ctx.activeBrokerId)
        : ctx.leads[0]);

    if (lead) {
      const leadProj =
        ctx.projects.find((p) => p.id === lead.projectId) || targetProject;
      const candidateUnits = ctx.units
        .filter(
          (u) =>
            u.projectId === leadProj.id &&
            (u.status === 'Available' || u.heldByLeadId === lead.id)
        )
        .sort((a, b) => {
          const aBhkMatch = a.bhk === lead.interestedBhk ? 0 : 1;
          const bBhkMatch = b.bhk === lead.interestedBhk ? 0 : 1;
          if (aBhkMatch !== bBhkMatch) return aBhkMatch - bBhkMatch;
          const aDiff = Math.abs(getUnitAllInclusivePrice(a) - lead.budgetInr);
          const bDiff = Math.abs(getUnitAllInclusivePrice(b) - lead.budgetInr);
          return aDiff - bDiff;
        });

      const topUnits = candidateUnits.slice(0, 3);
      const primaryUnit = topUnits[0];

      if (primaryUnit) {
        const agreementVal = getUnitAllInclusivePrice(primaryUnit);
        const gst = Math.round(agreementVal * 0.05);
        const stampDuty = Math.round(agreementVal * 0.06);
        const totalAllIn = agreementVal + gst + stampDuty;
        const estBrokerage = Math.round(
          (agreementVal * leadProj.brokerSharePct) / 100
        );

        const unitLines = topUnits
          .map(
            (u, idx) =>
              `${idx + 1}. Unit ${u.unitNumber} (${u.wing}, Floor ${u.floor}) — ${u.bhk} · ${u.carpetAreaSqFt.toLocaleString('en-IN')} sq.ft · ${u.facing} · Agreement: ${formatInr(getUnitAllInclusivePrice(u))} [${u.status}]`
          )
          .join('\n');

        return `Buyer Match Analysis — ${lead.buyerName}
Stage: ${lead.stage} · Requirement: ${lead.interestedBhk} · Stated Budget: ${formatInr(lead.budgetInr)}
Project: ${leadProj.name} (${leadProj.location})

Recommended Units:
${unitLines}

Primary Pitch — Unit ${primaryUnit.unitNumber} Cost Sheet:
• Agreement Value (Base + Floor Rise + PLC): ${formatInr(agreementVal)}
• GST (5%): ${formatInr(gst)}
• Stamp Duty & Reg. (6%): ${formatInr(stampDuty)}
• All-Inclusive Outflow: ${formatInr(totalAllIn)}
• Channel Partner Pass-Through (${leadProj.brokerSharePct}%): ${formatInr(estBrokerage)}`;
      }
    }
  }

  // 2. Cost Sheet / GST / Stamp Duty Query
  if (
    q.includes('cost sheet') ||
    q.includes('gst') ||
    q.includes('stamp duty') ||
    q.includes('price') ||
    q.includes('pricing') ||
    q.includes('payment')
  ) {
    // Check if a specific unit number is mentioned (e.g., 502, 401, etc.)
    const unitNumMatch = q.match(/\b([1-9]0[1-4])\b/);
    let sampleUnit = unitNumMatch
      ? projectUnits.find((u) => u.unitNumber === unitNumMatch[1])
      : undefined;

    if (!sampleUnit) {
      if (q.includes('4 bhk')) {
        sampleUnit =
          availUnits.find((u) => u.bhk.includes('4 BHK')) ||
          projectUnits.find((u) => u.bhk.includes('4 BHK'));
      } else if (q.includes('2 bhk')) {
        sampleUnit =
          availUnits.find((u) => u.bhk.includes('2 BHK')) ||
          projectUnits.find((u) => u.bhk.includes('2 BHK'));
      } else {
        sampleUnit =
          availUnits.find((u) => u.bhk.includes('3 BHK')) ||
          availUnits[0] ||
          projectUnits[0];
      }
    }

    if (sampleUnit) {
      const agreementVal = getUnitAllInclusivePrice(sampleUnit);
      const gst5 = Math.round(agreementVal * 0.05);
      const stamp6 = Math.round(agreementVal * 0.06);
      const grandTotal = agreementVal + gst5 + stamp6;
      const perSqFt = Math.round(agreementVal / sampleUnit.carpetAreaSqFt);
      const brokerFee = Math.round(
        (agreementVal * targetProject.brokerSharePct) / 100
      );

      return `All-Inclusive Cost Sheet — ${targetProject.name} (Unit ${sampleUnit.unitNumber})
Configuration: ${sampleUnit.bhk} · ${sampleUnit.carpetAreaSqFt.toLocaleString('en-IN')} sq.ft RERA Carpet · Floor ${sampleUnit.floor} (${sampleUnit.wing})
Current Status: ${sampleUnit.status} · Effective Rate: ₹${perSqFt.toLocaleString('en-IN')}/sq.ft

1. Agreement Value Breakdown:
• Base Price: ${formatInr(sampleUnit.basePriceInr)}
• Floor Rise Loading: ${formatInr(sampleUnit.floorRiseInr)}
• Preferential Location Charge (PLC - ${sampleUnit.facing}): ${formatInr(sampleUnit.plcInr)}
• Total Agreement Value: ${formatInr(agreementVal)}

2. Statutory Taxes & Duties:
• GST @ 5% (Under-Construction Mandate): ${formatInr(gst5)}
• Stamp Duty & Registration @ 6%: ${formatInr(stamp6)}
• Total All-Inclusive Buyer Outflow: ${formatInr(grandTotal)}

3. Standard Construction-Linked Payment Schedule:
• Booking Token (10%): ${formatInr(Math.round(agreementVal * 0.1))}
• Within 30 Days on Agreement Execution (20%): ${formatInr(Math.round(agreementVal * 0.2))}
• Plinth & Superstructure Milestones (45%): ${formatInr(Math.round(agreementVal * 0.45))}
• MEP, Facade & OC Possession (25%): ${formatInr(Math.round(agreementVal * 0.25))}
• Eligible Channel Partner Brokerage (${targetProject.brokerSharePct}%): ${formatInr(brokerFee)}`;
    }
  }

  // 3. Commission / Payout / Brokerage Query
  if (
    q.includes('commission') ||
    q.includes('payout') ||
    q.includes('brokerage') ||
    q.includes('ledger') ||
    q.includes('earning')
  ) {
    const scopedBookings =
      ctx.role === 'Broker'
        ? ctx.bookings.filter((b) => b.brokerId === ctx.activeBrokerId)
        : ctx.bookings;

    const pendingList = scopedBookings.filter(
      (b) => b.commissionStatus === 'Pending Approval'
    );
    const approvedList = scopedBookings.filter(
      (b) => b.commissionStatus === 'Approved'
    );
    const releasedList = scopedBookings.filter(
      (b) => b.commissionStatus === 'Released'
    );

    const sumComm = (arr: BookingRecord[]) =>
      arr.reduce((acc, b) => acc + b.commissionAmountInr, 0);

    const lines = scopedBookings
      .map((b) => {
        const proj = ctx.projects.find((p) => p.id === b.projectId);
        const unit = ctx.units.find((u) => u.id === b.unitId);
        const brk = ctx.brokers.find((br) => br.id === b.brokerId);
        return `• ${proj?.name} Unit ${unit?.unitNumber} (${brk?.firmName || brk?.name}) — Agreement: ${formatInr(b.agreementValueInr)} · Payout (${b.commissionPct}%): ${formatInr(b.commissionAmountInr)} [${b.commissionStatus}]`;
      })
      .join('\n');

    return `Commission & Payout Ledger Summary (${
      ctx.role === 'Admin'
        ? 'All Mandate Projects'
        : `${activeBroker?.name} · ${activeBroker?.firmName}`
    })

• Pending Approval (${pendingList.length} deals): ${formatInr(sumComm(pendingList))}
• Approved & Queued for Tranche Release (${approvedList.length} deals): ${formatInr(sumComm(approvedList))}
• Released / Settled (${releasedList.length} deals): ${formatInr(sumComm(releasedList))}
• Total Unsettled Liability: ${formatInr(sumComm(pendingList) + sumComm(approvedList))}

Active Booking Records:
${lines || 'No booking records in current scope.'}`;
  }

  // 4. Absorption / Velocity / Mandate Status Query
  if (
    q.includes('absorption') ||
    q.includes('velocity') ||
    q.includes('status') ||
    q.includes('summary') ||
    q.includes('overview') ||
    q.includes('mandate')
  ) {
    const totalCount = projectUnits.length;
    const soldPct = totalCount ? Math.round((soldUnits.length / totalCount) * 100) : 0;
    const committedPct = totalCount
      ? Math.round(((soldUnits.length + holdUnits.length) / totalCount) * 100)
      : 0;

    const soldValue = soldUnits.reduce(
      (acc, u) => acc + getUnitAllInclusivePrice(u),
      0
    );
    const availValue = availUnits.reduce(
      (acc, u) => acc + getUnitAllInclusivePrice(u),
      0
    );
    const holdValue = holdUnits.reduce(
      (acc, u) => acc + getUnitAllInclusivePrice(u),
      0
    );

    const wingBreakdown = targetProject.wings
      .map((wing) => {
        const wUnits = projectUnits.filter((u) => u.wing === wing);
        const wAvail = wUnits.filter((u) => u.status === 'Available').length;
        const wHold = wUnits.filter((u) => u.status === 'Hold').length;
        const wSold = wUnits.filter((u) => u.status === 'Sold').length;
        return `• ${wing}: ${wSold} Sold · ${wHold} Hold · ${wAvail} Available (of ${wUnits.length} units)`;
      })
      .join('\n');

    return `Mandate Absorption & Velocity — ${targetProject.name}
Location: ${targetProject.location} · RERA: ${targetProject.reraNumber}
Terms: ${targetProject.mandateType} · Gross Mandate Fee: ${targetProject.mandateCommissionPct}% · Broker Pass-Through: ${targetProject.brokerSharePct}%

Inventory Breakdown (${totalCount} Appointed Units):
• Sold / Booked: ${soldUnits.length} units (${soldPct}% absorption) — GTV: ${formatInr(soldValue)}
• Active 24h Hold: ${holdUnits.length} units (${committedPct}% total committed) — GTV: ${formatInr(holdValue)}
• Available Inventory: ${availUnits.length} units — Unsold Value: ${formatInr(availValue)}

Wing-Level Stack Distribution:
${wingBreakdown}`;
  }

  // 5. Available Units / BHK Filter Query (e.g., "Available 3 BHK units in Skyline Towers")
  const bhkFilter = q.includes('2 bhk')
    ? '2 BHK'
    : q.includes('3 bhk')
    ? '3 BHK'
    : q.includes('4 bhk')
    ? '4 BHK'
    : null;

  const filteredAvail = bhkFilter
    ? availUnits.filter((u) => u.bhk.toLowerCase().includes(bhkFilter.toLowerCase()))
    : availUnits;

  const displayUnits = filteredAvail.slice(0, 8);
  const unitListText = displayUnits
    .map(
      (u) =>
        `• Unit ${u.unitNumber} (${u.wing}, Floor ${u.floor}) — ${u.bhk} · ${u.carpetAreaSqFt.toLocaleString('en-IN')} sq.ft · ${u.facing} · Agreement: ${formatInr(getUnitAllInclusivePrice(u))}`
    )
    .join('\n');

  const holdListText = holdUnits
    .map((u) => {
      const heldLead = ctx.leads.find((l) => l.id === u.heldByLeadId);
      return `• Unit ${u.unitNumber} (${u.bhk}, Floor ${u.floor}) — Held for ${heldLead?.buyerName || 'Active Prospect'} (${formatInr(getUnitAllInclusivePrice(u))})`;
    })
    .join('\n');

  return `Live Inventory Snapshot — ${targetProject.name}${bhkFilter ? ` (${bhkFilter})` : ''}
RERA: ${targetProject.reraNumber} · Mandate Fee: ${targetProject.mandateCommissionPct}% (CP Share: ${targetProject.brokerSharePct}%)

Available Units (${filteredAvail.length}${bhkFilter ? ` matching ${bhkFilter}` : ` of ${projectUnits.length} total`}):
${unitListText || 'No units currently available matching this filter.'}${
    filteredAvail.length > 8
      ? `\n...and ${filteredAvail.length - 8} additional available units in the stacking matrix.`
      : ''
  }

Units Currently on Hold (${holdUnits.length}):
${holdListText || 'None currently on hold.'}`;
}
