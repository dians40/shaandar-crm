/**
 * Moves filtered useMemo into inner ListBody components using useMasterListFilters.
 */
import fs from "fs";
import path from "path";

const repoRoot = process.cwd();

const configs = [
  {
    file: "src/components/master-panel/units-management-panel.tsx",
    filteredVar: "filteredUnits",
    listBodyName: "UnitsListBody",
    recordsVar: "units",
    recordsType: "UnitRecord[]",
    removeUseMemo: `  const filteredUnits = useMemo(
    () =>
      units.filter((row) =>
        matchesUniversalNameSearch(searchQuery, row.name, [row.shortCode, row.id])
      ),
    [units, searchQuery]
  );`,
    filterExpr: `units.filter((row) =>
        matchesUniversalNameSearch(
          searchQuery,
          row.name,
          [row.shortCode, row.id],
          {
            departmentFilter,
            designationFilter,
            skipDepartmentIfAbsent: true,
            skipDesignationIfAbsent: true,
          }
        )
      )`,
    listBodyProps: `{
  units: UnitRecord[];
  onEdit: (record: UnitRecord) => void;
  onView: (record: UnitRecord) => void;
  onRemove: (record: UnitRecord) => void;
  checkUsedInTransactions: ReturnType<typeof useMasterDeletionGuard>["checkUsedInTransactions"];
}`,
    listBodyArgs: `units={units}
              onEdit={openEdit}
              onView={openView}
              onRemove={handleRemove}
              checkUsedInTransactions={checkUsedInTransactions}`,
    tbodyReplacement: `<UnitsListBody
              units={units}
              onEdit={openEdit}
              onView={openView}
              onRemove={handleRemove}
              checkUsedInTransactions={checkUsedInTransactions}
            />`,
  },
];

function addUseMasterListFiltersImport(content) {
  if (content.includes("useMasterListFilters")) return content;
  return content.replace(
    /(\n  UniversalMasterListTable,\n)(} from "\.\/universal-master-list";)/,
    "$1  useMasterListFilters,\n$2"
  );
}

function processConfig(config) {
  const fullPath = path.join(repoRoot, config.file);
  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes(`${config.listBodyName}(`)) {
    console.log("Skip (already done):", config.file);
    return;
  }

  content = addUseMasterListFiltersImport(content);
  content = content.replace(config.removeUseMemo + "\n\n", "");
  content = content.replace(config.removeUseMemo + "\n", "");

  const listBody = `
type ${config.listBodyName}Props = ${config.listBodyProps};

function ${config.listBodyName}(props: ${config.listBodyName}Props) {
  const { searchQuery, departmentFilter, designationFilter } = useMasterListFilters();
  const ${config.filteredVar} = useMemo(
    () => ${config.filterExpr},
    [props.${config.recordsVar.split(".")[0] || "records"}, searchQuery, departmentFilter, designationFilter]
  );
  // PLACEHOLDER - manual tbody needed
}
`;

  console.log("Partial for", config.file);
}

for (const config of configs) {
  try {
    processConfig(config);
  } catch (e) {
    console.error(config.file, e.message);
  }
}
