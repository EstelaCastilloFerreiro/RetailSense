"""
Data Preprocessing Pipeline
Handles Excel loading, cleaning, feature engineering, and season extraction
"""

import pandas as pd
import numpy as np
import re
from typing import Tuple, Dict, Optional
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import joblib
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_excel(file_path: str) -> pd.DataFrame:
    """
    Load Excel file and return as DataFrame
    
    Args:
        file_path: Path to Excel file
        
    Returns:
        DataFrame with raw data
    """
    logger.info(f"Loading Excel file: {file_path}")
    
    try:
        df = pd.read_excel(file_path, engine='openpyxl')
        logger.info(f"Loaded {len(df)} rows with {len(df.columns)} columns")
        return df
    except Exception as e:
        logger.error(f"Error loading Excel: {e}")
        raise


def extract_season(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract season_type (PV/OI) and season_year from the Tema column
    
    Tema format examples:
    - "T_PV25 05 MARFIL_P" → PV, 2025
    - "T_OI26 12 JADE MEX" → OI, 2026
    - "SIN DEFINIR" → None, None
    
    Args:
        df: DataFrame with Tema column
        
    Returns:
        DataFrame with added season_type and season_year columns
    """
    logger.info("Extracting season information from Tema column")
    
    def parse_season(tema: str) -> Tuple[Optional[str], Optional[int]]:
        if pd.isna(tema) or tema == "SIN DEFINIR":
            return None, None
        
        tema = str(tema).strip()
        
        # Pattern: T_PV25 or T_OI26
        match = re.search(r'(PV|OI)(\d{2})', tema)
        if match:
            season_type = match.group(1)
            year_short = int(match.group(2))
            # Convert 25 → 2025, 26 → 2026
            season_year = 2000 + year_short
            return season_type, season_year
        
        return None, None
    
    df[['season_type', 'season_year']] = df['Tema'].apply(
        lambda x: pd.Series(parse_season(x))
    )
    
    valid_seasons = df[df['season_type'].notna()]
    logger.info(f"Extracted season info for {len(valid_seasons)}/{len(df)} rows")
    logger.info(f"Unique seasons found: {sorted(valid_seasons['season_type'].unique())}")
    logger.info(f"Years range: {valid_seasons['season_year'].min()}-{valid_seasons['season_year'].max()}")
    
    return df


def parse_dates(df: pd.DataFrame) -> pd.DataFrame:
    """
    Parse date columns and extract temporal features
    
    Args:
        df: DataFrame with date columns
        
    Returns:
        DataFrame with parsed dates and temporal features
    """
    logger.info("Parsing date columns")
    
    date_columns = ['Fecha Presupuesto', 'Fecha Tope', 'Fecha REAL entrada en almacén']
    
    for col in date_columns:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors='coerce', dayfirst=True)
            logger.info(f"Parsed {col}")
    
    # Extract month from first available date
    if 'Fecha Presupuesto' in df.columns:
        df['Month'] = df['Fecha Presupuesto'].dt.month
    
    return df


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean data: handle missing values, outliers
    
    Args:
        df: Raw DataFrame
        
    Returns:
        Cleaned DataFrame
    """
    logger.info("Cleaning data")
    
    initial_rows = len(df)
    
    # Remove rows with missing critical fields
    critical_fields = ['Cantidad Pedida', 'Precio Coste', 'P.V.P.']
    df = df.dropna(subset=critical_fields)
    
    logger.info(f"Dropped {initial_rows - len(df)} rows with missing critical fields")
    
    # Remove negative or zero quantities
    df = df[df['Cantidad Pedida'] > 0]
    df = df[df['Precio Coste'] > 0]
    df = df[df['P.V.P.'] > 0]
    
    # Fill categorical NaNs with "UNKNOWN"
    categorical_cols = ['Marca', 'Artículo', 'Modelo Artículo', 'Color', 
                       'Talla', 'Línea Producto', 'Nombre TPV', 'Tema']
    
    for col in categorical_cols:
        if col in df.columns:
            df[col] = df[col].fillna('UNKNOWN')
    
    logger.info(f"Final cleaned data: {len(df)} rows")
    
    return df


def build_features(df: pd.DataFrame, season_type: str) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Build feature matrix X and target y for training/prediction
    
    Args:
        df: Cleaned DataFrame
        season_type: 'PV' or 'OI' to filter data
        
    Returns:
        Tuple of (X features, y target)
    """
    logger.info(f"Building features for season type: {season_type}")
    
    # Filter by season type
    df_filtered = df[df['season_type'] == season_type].copy()
    logger.info(f"Filtered to {len(df_filtered)} rows for season {season_type}")
    
    if len(df_filtered) == 0:
        logger.warning(f"No data found for season {season_type}")
        return pd.DataFrame(), pd.Series()
    
    # Select feature columns
    categorical_features = [
        'Marca', 'Artículo', 'Modelo Artículo', 'Color', 
        'Talla', 'Línea Producto', 'Nombre TPV'
    ]
    
    numerical_features = [
        'season_year', 'Precio Coste', 'P.V.P.', 'Importe de Coste'
    ]
    
    # Add Month if available
    if 'Month' in df_filtered.columns:
        numerical_features.append('Month')
    
    # Ensure all features exist
    available_categorical = [f for f in categorical_features if f in df_filtered.columns]
    available_numerical = [f for f in numerical_features if f in df_filtered.columns]
    
    X = df_filtered[available_categorical + available_numerical].copy()
    y = df_filtered['Cantidad Pedida'].copy()
    
    logger.info(f"Feature matrix: {X.shape}")
    logger.info(f"Categorical features: {len(available_categorical)}")
    logger.info(f"Numerical features: {len(available_numerical)}")
    
    return X, y


def create_preprocessor(X: pd.DataFrame) -> ColumnTransformer:
    """
    Create sklearn preprocessing pipeline for categorical and numerical features
    
    Args:
        X: Feature DataFrame
        
    Returns:
        ColumnTransformer fitted on X
    """
    logger.info("Creating preprocessing pipeline")
    
    # Identify column types
    categorical_cols = X.select_dtypes(include=['object']).columns.tolist()
    numerical_cols = X.select_dtypes(include=['number']).columns.tolist()
    
    # For CatBoost, we don't need one-hot encoding
    # Just return column indices for categorical features
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', 'passthrough', categorical_cols),
            ('num', 'passthrough', numerical_cols)
        ]
    )
    
    logger.info(f"Preprocessor created with {len(categorical_cols)} categorical and {len(numerical_cols)} numerical features")
    
    return preprocessor


def save_preprocessor(preprocessor, season_type: str, output_dir: str = 'forecasting_engine/preprocessors'):
    """
    Save preprocessor to disk
    
    Args:
        preprocessor: Fitted preprocessor
        season_type: 'PV' or 'OI'
        output_dir: Directory to save preprocessor
    """
    file_path = f"{output_dir}/preprocessor_{season_type}.pkl"
    joblib.dump(preprocessor, file_path)
    logger.info(f"Saved preprocessor to {file_path}")


def load_preprocessor(season_type: str, input_dir: str = 'forecasting_engine/preprocessors'):
    """
    Load preprocessor from disk
    
    Args:
        season_type: 'PV' or 'OI'
        input_dir: Directory containing preprocessor
        
    Returns:
        Loaded preprocessor
    """
    file_path = f"{input_dir}/preprocessor_{season_type}.pkl"
    preprocessor = joblib.load(file_path)
    logger.info(f"Loaded preprocessor from {file_path}")
    return preprocessor


def prepare_data_for_training(file_path: str, season_type: str) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame]:
    """
    Full pipeline: load → parse → clean → extract features
    
    Args:
        file_path: Path to Excel file
        season_type: 'PV' or 'OI'
        
    Returns:
        Tuple of (X features, y target, full DataFrame)
    """
    logger.info(f"=== Starting data preparation pipeline for {season_type} ===")
    
    # Load data
    df = load_excel(file_path)
    
    # Parse dates
    df = parse_dates(df)
    
    # Extract season
    df = extract_season(df)
    
    # Clean data
    df = clean_data(df)
    
    # Build features
    X, y = build_features(df, season_type)
    
    logger.info(f"=== Data preparation complete ===")
    logger.info(f"Final dataset: {len(X)} samples, {X.shape[1]} features")
    
    return X, y, df
