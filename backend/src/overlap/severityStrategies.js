

function rangesOverlap(a, b) {
  if (!a || !b || a.start == null || b.start == null) return false;
  return a.start <= b.end && b.start <= a.end;
}

const SEVERITY_STRATEGIES = [
  {
    severity: "same-line",
    // applies: (mine, other) =>
    //   mine.functionName === other.functionName && rangesOverlap(mine.lineRange, other.lineRange),
    applies: (mine, other) =>
      mine.editedLine != null &&
      other.editedLine != null &&
      mine.editedLine === other.editedLine,
  },
  {
    severity: "same-function",
    applies: (mine, other) => mine.functionName === other.functionName,
  },
  {
    severity: "same-file",
    applies: () => true,
  },
];


function determineSeverity(mine, other) {
  const match = SEVERITY_STRATEGIES.find((strategy) =>
    strategy.applies(mine, other),
  );
  return match.severity;
}

module.exports = { determineSeverity, rangesOverlap };
