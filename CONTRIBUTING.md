# 🤝 Contributing to CHRONOS Protocol

Thank you for your interest in contributing to CHRONOS! We welcome contributions from the community.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)

---

## 📜 Code of Conduct

By participating in this project, you agree to:

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

---

## 🚀 How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/Panchu11/chronos/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (OS, Node version, etc.)

### Suggesting Features

1. Check existing [Issues](https://github.com/Panchu11/chronos/issues) and [Discussions](https://github.com/Panchu11/chronos/discussions)
2. Create a new issue with:
   - Clear use case
   - Proposed solution
   - Alternative solutions considered
   - Impact on existing functionality

### Code Contributions

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

---

## 💻 Development Setup

### Prerequisites

- Node.js 18+
- Rust 1.75+
- Solana CLI 1.18+
- Anchor 0.30+
- Git

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/chronos.git
cd chronos

# Add upstream remote
git remote add upstream https://github.com/Panchu11/chronos.git

# Install dependencies
npm install

# Build programs
anchor build

# Run tests
anchor test
```

---

## 🔄 Pull Request Process

### Before Submitting

1. **Update your fork**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run tests**:
   ```bash
   anchor test
   npm run lint
   ```

3. **Update documentation** if needed

### PR Guidelines

1. **Title**: Use clear, descriptive titles
   - ✅ "Add liquidation protection to Temporal Vaults"
   - ❌ "Fix bug"

2. **Description**: Include:
   - What changes were made
   - Why the changes were necessary
   - How to test the changes
   - Related issues (if any)

3. **Commits**: Use conventional commits
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `test:` - Test additions/changes
   - `refactor:` - Code refactoring
   - `chore:` - Maintenance tasks

### Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged

---

## 📝 Coding Standards

### Rust (Smart Contracts)

```rust
// Use descriptive names
pub fn execute_strategy(ctx: Context<ExecuteStrategy>) -> Result<()> {
    // Add comments for complex logic
    let vault = &mut ctx.accounts.vault;
    
    // Use proper error handling
    require!(vault.is_active, ErrorCode::VaultInactive);
    
    Ok(())
}
```

**Guidelines**:
- Follow Rust naming conventions
- Use `Result<()>` for all instructions
- Add comprehensive error messages
- Document public functions
- Keep functions focused and small

### TypeScript (Frontend/Tests)

```typescript
// Use TypeScript types
interface VaultConfig {
  strategy: StrategyType;
  riskLevel: number;
  rebalanceFrequency: number;
}

// Use async/await
async function createVault(config: VaultConfig): Promise<string> {
  // Implementation
}
```

**Guidelines**:
- Use TypeScript strict mode
- Define interfaces for all data structures
- Use async/await over promises
- Follow ESLint rules
- Add JSDoc comments for public functions

---

## 🧪 Testing Guidelines

### Smart Contract Tests

```typescript
describe("chronos_vault", () => {
  it("should initialize vault successfully", async () => {
    // Arrange
    const strategy = { conservative: {} };
    
    // Act
    const tx = await program.methods
      .initializeVault(strategy, 1, 86400)
      .rpc();
    
    // Assert
    const vault = await program.account.vault.fetch(vaultPda);
    expect(vault.strategyType).to.deep.equal(strategy);
  });
});
```

**Requirements**:
- Test happy paths
- Test error cases
- Test edge cases
- Use descriptive test names
- Aim for >80% coverage

### Frontend Tests

```typescript
describe("VaultCard", () => {
  it("should display vault information correctly", () => {
    render(<VaultCard vault={mockVault} />);
    expect(screen.getByText("Conservative")).toBeInTheDocument();
  });
});
```

---

## 📚 Documentation

### Code Documentation

- Add JSDoc/RustDoc comments for public APIs
- Include examples in documentation
- Keep README.md up to date
- Update CHANGELOG.md for significant changes

### Commit Messages

```
feat(vault): add liquidation protection mechanism

- Implement slot reservation before liquidation threshold
- Add tests for liquidation scenarios
- Update documentation

Closes #123
```

---

## 🏆 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation

---

## 📞 Questions?

- Open a [Discussion](https://github.com/Panchu11/chronos/discussions)
- Join our community chat
- Email: [contact info]

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to CHRONOS Protocol! 🚀**

