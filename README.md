# ⚡ VLSI Studio - Autonomous Chip Design & Physical Backend Flow
> **Release Date:** September 23, 2026  
> **Version:** v2.4.0 (Full 7-Stage Front-End & 7-Stage Back-End EDA Pipeline)

VLSI Studio is an end-to-end, AI-assisted electronic design automation (EDA) web workbench for digital integrated circuit (IC) synthesis, verification, and physical ASIC design.

---

## 🚀 Key Features

### 🔹 7-Stage Front-End ASIC Design Flow
1. **Specification:** IEEE 1800 functional specs, I/O pin counts, power targets & architecture definitions.
2. **Logical Diagram:** Gate-level schematics with IEEE Std 91/91a gate legends.
3. **Logical Verification:** Live Boolean logic simulator, truth tables, and signal evaluation.
4. **RTL Design:** Multi-HDL code generator supporting **Verilog**, **SystemVerilog**, and **VHDL**.
5. **RTL Verification:** SVA/UVM testbench generator, expected vs. actual scoreboards, and simulation console logs.
6. **Logic Synthesis:** CMOS transistor-level pull-up/pull-down sizing ($W_p \approx 2.5 \cdot W_n$) and stick diagrams.
7. **DFT Verification:** Design-for-Testability pattern generator and scan-chain verification.

### 🔸 7-Stage Back-End ASIC Physical Design Flow
1. **Floorplan:** Die boundary sizing, core aspect ratio & I/O pad ring layout.
2. **Power Plan:** Dual VDD/VSS power rings, M5/M6 strap mesh & IR-drop heatmap simulator.
3. **Placement:** Standard cell row placement, legalization & density optimization.
4. **Clock Tree Synthesis (CTS):** Symmetric H-Tree clock mesh, skew balancing & latency minimization.
5. **Routing:** Global track assignment, detail routing across metal layers M1–M6 & DRC clean routing.
6. **Static Timing Analysis (STA):** Setup & hold slack calculations ($WNS / WHS$), $F_{\max}$ calculator & PVT corner sweep.
7. **Sign-off Stage:** DRC, LVS, ERC, Antenna verification matrix & GDSII stream file export (`.gds`).

---

## 🛠️ Tech Stack & Setup

* **Frontend Framework:** React 18, TypeScript, Vite
* **Styling:** Custom CSS + TailwindCSS, Lucide Icons, Framer Motion
* **AI Engine:** Google Gemini AI API integration

### Run Locally

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Set `GEMINI_API_KEY` in `.env.local`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```

4. **Build Production Bundle:**
   ```bash
   npm run build
   ```

---
*Updated on September 23, 2026*
