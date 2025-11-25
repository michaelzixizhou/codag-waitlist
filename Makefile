.PHONY: run open clean

# Start local dev server
run:
	@echo "Starting server at http://localhost:8080"
	@python3 -m http.server 8080

# Open in browser and run
open:
	@open http://localhost:8080 &
	@python3 -m http.server 8080

# Clean any generated files
clean:
	@rm -rf .DS_Store
