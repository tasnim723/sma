try:
    print("Importing main...")
    import main
    print("Successfully imported main.")
    print("Setting up app...")
    print(main.app)
except Exception as e:
    import traceback
    traceback.print_exc()
