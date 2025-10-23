# CHRONOS Protocol - Economic Simulations

This directory contains Jupyter notebooks demonstrating the economic benefits and performance characteristics of the CHRONOS Protocol.

## 📊 Notebooks

### 1. MEV Impact Analysis (`1_mev_impact_analysis.ipynb`)
Analyzes the MEV (Maximal Extractable Value) impact on traditional DEXs compared to CHRONOS Protocol's deterministic execution model.

**Key Metrics:**
- Sandwich attack frequency
- User value loss from MEV
- MEV extraction by bots
- CHRONOS MEV prevention effectiveness

**Expected Results:**
- ~40% of trades attacked by MEV on traditional DEXs
- 95%+ reduction in MEV-related losses with CHRONOS
- Significant savings for users across all trade sizes

---

### 2. Slot Pricing Model (`2_slot_pricing_model.ipynb`)
Models the pricing dynamics of Solana blockspace futures in the CHRONOS Market.

**Key Concepts:**
- Dutch auction price discovery
- Congestion-based pricing
- Supply/demand equilibrium
- Secondary market dynamics

**Expected Results:**
- Base price: 0.01 SOL during low congestion
- Peak price: up to 1.0 SOL during extreme congestion
- Efficient price discovery through Dutch auctions
- Market equilibrium analysis

---

### 3. Vault Performance Analysis (`3_vault_performance_analysis.ipynb`)
Analyzes the performance of CHRONOS Temporal Vaults compared to traditional DeFi vaults.

**Key Metrics:**
- Execution guarantee rate
- Liquidation protection effectiveness
- Strategy performance (Yield, Delta Neutral, Arbitrage)
- Risk-adjusted returns

**Expected Results:**
- 99.9% execution success rate vs ~60% for traditional vaults
- 98% liquidation prevention vs 60% for traditional vaults
- Strong risk-adjusted returns across all strategies

---

## 🚀 Setup

### Prerequisites
- Python 3.8 or higher
- pip package manager

### Installation

1. **Create a virtual environment (recommended):**
```bash
python -m venv venv

# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

---

## 📈 Running the Notebooks

### Option 1: Jupyter Notebook
```bash
jupyter notebook
```
Then navigate to the `notebooks/` directory and open any notebook.

### Option 2: JupyterLab (recommended)
```bash
jupyter lab
```

### Option 3: VS Code
1. Install the Jupyter extension for VS Code
2. Open any `.ipynb` file
3. Select your Python kernel
4. Run cells interactively

---

## 📁 Directory Structure

```
simulations/
├── README.md                           # This file
├── requirements.txt                    # Python dependencies
├── notebooks/
│   ├── 1_mev_impact_analysis.ipynb    # MEV analysis
│   ├── 2_slot_pricing_model.ipynb     # Pricing dynamics
│   └── 3_vault_performance_analysis.ipynb  # Vault performance
└── outputs/                            # Generated charts and data (created when running)
```

---

## 🎯 Key Findings Summary

### MEV Impact
- **Traditional DEXs**: ~40% of trades suffer MEV attacks
- **CHRONOS**: 100% MEV prevention through deterministic execution
- **User Savings**: 95%+ reduction in MEV-related losses

### Blockspace Pricing
- **Dynamic Pricing**: 0.01 - 1.0 SOL based on congestion
- **Dutch Auctions**: Efficient price discovery mechanism
- **Market Equilibrium**: Natural supply/demand balance

### Vault Performance
- **Execution Rate**: 99.9% vs 60% (traditional)
- **Liquidation Protection**: 98% vs 60% (traditional)
- **Risk-Adjusted Returns**: Sharpe ratios of 1.5 - 2.5

---

## 📊 Visualization Examples

Each notebook generates interactive Plotly charts including:
- Time series analysis
- Comparative bar charts
- Distribution plots
- Risk-return scatter plots
- Cumulative performance tracking

---

## 🔬 Methodology

### Simulation Parameters
- **Sample Size**: 10,000 trades for MEV analysis
- **Time Period**: 30 days for vault performance
- **Network Conditions**: 24-hour congestion cycles
- **Risk Models**: Beta distributions for realistic scenarios

### Statistical Methods
- Monte Carlo simulations
- Exponential decay models (Dutch auctions)
- Risk-adjusted performance metrics (Sharpe, Sortino, Calmar)
- Supply/demand equilibrium analysis

---

## 🛠️ Customization

You can modify simulation parameters in each notebook:

**MEV Analysis:**
```python
n_trades = 10000  # Number of trades to simulate
trade_sizes = np.random.lognormal(mean=7, sigma=1.5, size=n_trades)
```

**Slot Pricing:**
```python
BASE_PRICE = 0.01  # SOL
MAX_PRICE = 1.0    # SOL
AUCTION_DURATION = 300  # seconds
```

**Vault Performance:**
```python
days = 30
INITIAL_CAPITAL = 100000  # USD
strategies = {...}  # Modify strategy parameters
```

---

## 📝 Notes

- All simulations use `np.random.seed(42)` for reproducibility
- Results may vary slightly due to random sampling
- Charts are interactive - hover for details, zoom, pan
- Export charts as PNG/SVG using Plotly's built-in tools

---

## 🤝 Contributing

To add new simulations:
1. Create a new notebook in `notebooks/`
2. Follow the existing structure and naming convention
3. Include clear markdown explanations
4. Add visualization and summary statistics
5. Update this README with the new notebook details

---

## 📚 References

- [Solana Documentation](https://docs.solana.com/)
- [MEV Research](https://ethereum.org/en/developers/docs/mev/)
- [Dutch Auction Mechanisms](https://en.wikipedia.org/wiki/Dutch_auction)
- [Risk-Adjusted Performance Metrics](https://www.investopedia.com/terms/s/sharperatio.asp)

---

## 📧 Support

For questions or issues with the simulations, please refer to the main CHRONOS Protocol documentation or open an issue in the repository.

