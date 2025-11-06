# Rendering PlantUML Diagrams

This guide shows how to render the UML diagrams included in this repository using PlantUML.

## Prerequisites

- **PlantUML JAR**: `plantuml-1.2025.10.jar` (or any recent version)
- **Java**: JRE 8+ installed and in PATH
- **Graphviz** (optional, for better diagram layout)

## Files Location

- **Main diagram file**: `DOCUMENTATION/UML_DIAGRAMS.puml`
- **Contains 8 diagrams**:
  1. System Context Diagram
  2. Collaboration Diagram (Customer Order Flow)
  3. Sequence Diagram (Staff Order Management)
  4. Class Diagram (Domain Models)
  5. Component Diagram (Service Architecture)
  6. State Diagram (Order Lifecycle)
  7. Activity Diagram (Payment Processing)
  8. Use Case Diagram (Actors & Use Cases)

## Rendering Options

### Option 1: Render All Diagrams at Once

**Command**:
```bash
java -jar C:\Users\aahil\Downloads\plantuml-1.2025.10.jar DOCUMENTATION/UML_DIAGRAMS.puml -o DOCUMENTATION/diagrams
```

**Output**: Creates PNG files for each diagram in `DOCUMENTATION/diagrams/`:
- `UML_DIAGRAMS_SystemContext.png`
- `UML_DIAGRAMS_CustomerOrderCollaboration.png`
- `UML_DIAGRAMS_StaffOrderManagement.png`
- `UML_DIAGRAMS_ClassDiagram.png`
- `UML_DIAGRAMS_ComponentDiagram.png`
- `UML_DIAGRAMS_OrderStateMachine.png`
- `UML_DIAGRAMS_PaymentActivity.png`
- `UML_DIAGRAMS_UseCaseDiagram.png`

### Option 2: Render as PDF

```bash
java -jar C:\Users\aahil\Downloads\plantuml-1.2025.10.jar -tpdf DOCUMENTATION/UML_DIAGRAMS.puml -o DOCUMENTATION/diagrams
```

**Output**: PDF files in `DOCUMENTATION/diagrams/`

### Option 3: Render as SVG (Best for Web)

```bash
java -jar C:\Users\aahil\Downloads\plantuml-1.2025.10.jar -tsvg DOCUMENTATION/UML_DIAGRAMS.puml -o DOCUMENTATION/diagrams
```

**Output**: SVG files (scalable, embed in HTML/Markdown)

### Option 4: Render with Higher Resolution

```bash
java -jar C:\Users\aahil\Downloads\plantuml-1.2025.10.jar -DPLANTUML_LIMIT_SIZE=8192 DOCUMENTATION/UML_DIAGRAMS.puml -o DOCUMENTATION/diagrams
```

**Output**: Higher resolution PNG files

## Batch Rendering Script

### For Windows (Batch)

Create `render_diagrams.bat`:
```batch
@echo off
setlocal enabledelayedexpansion

set PLANTUML=C:\Users\aahil\Downloads\plantuml-1.2025.10.jar
set INPUT=DOCUMENTATION\UML_DIAGRAMS.puml
set OUTPUT=DOCUMENTATION\diagrams

echo Rendering PlantUML diagrams...
java -jar %PLANTUML% %INPUT% -o %OUTPUT%

if %ERRORLEVEL% EQU 0 (
    echo ✓ Diagrams rendered successfully!
    echo Output location: %OUTPUT%
    explorer %OUTPUT%
) else (
    echo ✗ Error rendering diagrams
    exit /b 1
)

endlocal
```

**Run**: Double-click `render_diagrams.bat` or run from terminal

### For Linux/macOS (Bash)

Create `render_diagrams.sh`:
```bash
#!/bin/bash

PLANTUML="/path/to/plantuml-1.2025.10.jar"
INPUT="DOCUMENTATION/UML_DIAGRAMS.puml"
OUTPUT="DOCUMENTATION/diagrams"

echo "Rendering PlantUML diagrams..."
java -jar "$PLANTUML" "$INPUT" -o "$OUTPUT"

if [ $? -eq 0 ]; then
    echo "✓ Diagrams rendered successfully!"
    echo "Output location: $OUTPUT"
    ls -lah "$OUTPUT"
else
    echo "✗ Error rendering diagrams"
    exit 1
fi
```

**Run**:
```bash
chmod +x render_diagrams.sh
./render_diagrams.sh
```

## Diagram Descriptions

### 1. System Context Diagram
- **Purpose**: High-level overview of system boundaries
- **Shows**: Customers, staff, external systems, and how components interact
- **Use case**: Stakeholder presentations, system overview

### 2. Collaboration Diagram (Customer Order Flow)
- **Purpose**: Shows interactions and message flows in customer ordering process
- **Shows**: All 24 steps from QR scan to payment confirmation
- **Participants**: Customer, Frontend, API Gateway, Auth, Menu, Order, Discount, Payment, Inventory, Notification, Database, Kafka
- **Use case**: Understanding complete customer journey

### 3. Sequence Diagram (Staff Order Management)
- **Purpose**: Time-based sequence of staff managing orders
- **Shows**: Login → View pending orders → Update status → Notifications
- **Key detail**: JWT token generation with tenant_id for staff
- **Use case**: Staff workflow documentation

### 4. Class Diagram (Domain Models)
- **Purpose**: Shows data model and relationships
- **Classes**: Tenant, User, Customer, Table, MenuItem, Category, Order, OrderItem, Payment, Inventory, Discount, Notification
- **Shows**: Attributes, methods, and relationships (1:1, 1:*, *:*)
- **Use case**: Understanding data structure and dependencies

### 5. Component Diagram (Service Architecture)
- **Purpose**: Shows service interactions and dependencies
- **Components**: API Gateway, 9 microservices, PostgreSQL, Redis, Kafka, Prometheus, Grafana
- **Shows**: Data flow between components
- **Use case**: Infrastructure planning, deployment architecture

### 6. State Diagram (Order Lifecycle)
- **Purpose**: Shows valid state transitions for orders
- **States**: PENDING → PREPARING → READY → SERVED → COMPLETED (or CANCELLED)
- **Transitions**: When each state change can occur
- **Use case**: State machine implementation, business logic validation

### 7. Activity Diagram (Payment Processing)
- **Purpose**: Shows decision points and activity flow for payment
- **Paths**: Online (Razorpay) vs Cash payment
- **Decision points**: Success/failure handling
- **Use case**: Payment flow documentation

### 8. Use Case Diagram (Actors & Use Cases)
- **Purpose**: Shows system functionality from user perspective
- **Actors**: Customer, Staff, Manager, System
- **Use cases**: Login, browse, order, pay, manage inventory, view analytics, etc.
- **Relationships**: Include/extend relationships between use cases
- **Use case**: Requirements documentation

## Editing Diagrams

All diagrams are in PlantUML syntax (text-based). To modify:

1. Open `DOCUMENTATION/UML_DIAGRAMS.puml` in any text editor
2. Find the diagram you want to edit (marked by `@startuml(id=DiagramName)`)
3. Modify the PlantUML code
4. Save and re-render using the commands above

## PlantUML Syntax Reference

### Basic Structure
```plantuml
@startuml(id=DiagramName)
title Diagram Title

' Your diagram code here

@enduml
```

### Common Elements

**Participants** (Collaboration/Sequence):
```plantuml
participant Actor as A
actor User as U
```

**Components**:
```plantuml
component [Component Name] as comp
database [Database] as db
```

**Classes**:
```plantuml
class ClassName {
  -privateAttr: Type
  #protectedAttr: Type
  +publicAttr: Type
  --
  +method(): ReturnType
}
```

**Relationships**:
```plantuml
ClassA "1" -- "*" ClassB : relationship
```

**State Machine**:
```plantuml
[*] --> State1
State1 --> State2 : Event
State2 --> [*]
```

## Troubleshooting

### Error: "java: command not found"
- Ensure Java is installed: `java -version`
- Add Java to PATH environment variable

### Error: "File not found"
- Use absolute paths: `C:\full\path\to\UML_DIAGRAMS.puml`
- Check file permissions

### Large File Size
- Use `-DPLANTUML_LIMIT_SIZE=16384` to increase size limit
- Simplify complex diagrams into separate files

### Rendering Takes Long
- PlantUML caches results in `.plantuml` directory
- Clear cache to force re-render: delete `~/.plantuml/` (Unix) or `%TEMP%\.plantuml\` (Windows)

## Integration with Tools

### VS Code
1. Install PlantUML extension: `jebbs.plantuml`
2. Open `.puml` file and press `Alt+D` to preview

### IntelliJ IDEA
1. Install PlantUML Integration plugin
2. Right-click on `.puml` file → "Generate PlantUML Diagrams"

### Online Viewers
- **PlantUML Online**: https://www.plantuml.com/plantuml/uml/
- Copy-paste `.puml` content to render instantly (no local setup needed)

## Output Examples

After rendering, you'll have diagrams like:
```
DOCUMENTATION/diagrams/
├── UML_DIAGRAMS_SystemContext.png
├── UML_DIAGRAMS_CustomerOrderCollaboration.png
├── UML_DIAGRAMS_StaffOrderManagement.png
├── UML_DIAGRAMS_ClassDiagram.png
├── UML_DIAGRAMS_ComponentDiagram.png
├── UML_DIAGRAMS_OrderStateMachine.png
├── UML_DIAGRAMS_PaymentActivity.png
└── UML_DIAGRAMS_UseCaseDiagram.png
```

Include in documentation:
```markdown
![Order Flow](diagrams/UML_DIAGRAMS_CustomerOrderCollaboration.png)
```

## Next Steps

1. Run rendering command from "Batch Rendering Script" section
2. Open generated diagrams in `DOCUMENTATION/diagrams/`
3. Include diagrams in documentation or presentations
4. Share with team for architecture discussions

---

**Questions?** Refer to official PlantUML docs: https://plantuml.com/en/
